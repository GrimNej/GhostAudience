import type { StepAnalysisInput } from "@ghost-audience/contracts";
import { describe, expect, it } from "vitest";
import { ApiError, asApiError } from "../errors";
import { supportsJsonObjectOutput } from "../providers/watsonx/model-features";
import { normalizeStepOutput } from "../validation/normalize-step-output";
import { buildSafeFallbackStepOutput } from "../validation/safe-fallback-step-output";
import { validateStepOutput } from "../validation/validate-step-output";

const hash = "a".repeat(64);
const input: StepAnalysisInput = {
  schemaVersion: "1.0",
  requestId: "request_00000001",
  idempotencyKey: hash,
  runId: "run_00000001",
  currentOrdinal: 0,
  priorPrefixHash: hash,
  expectedNextPrefixHash: hash,
  currentSegment: {
    id: "segment_00000001",
    heading: "INT. HOUSE - NIGHT",
    text: "Mira stops at the door.",
    sha256: hash,
  },
  priorAudienceState: {
    processedThroughOrdinal: -1,
    facts: [],
    assumptions: [],
    compactNarrativeState: "No information has been revealed.",
  },
  activeQuestions: [],
  analysisPolicy: {
    preservePlausibleAmbiguity: true,
    avoidAudienceProbabilities: true,
    requireEvidence: true,
    ignoreExternalStoryKnowledge: true,
  },
  limits: { maxNewQuestions: 8, maxOperations: 20 },
};

function evidence(overrides: Record<string, unknown> = {}) {
  return {
    segmentId: input.currentSegment.id,
    startOffset: 0,
    endOffset: 4,
    quote: "Mira",
    ...overrides,
  };
}

function validOutput(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0",
    requestId: input.requestId,
    factsAdded: [],
    assumptionsAdded: [],
    assumptionUpdates: [],
    questionOperations: [],
    warnings: [],
    ...overrides,
  };
}

function openQuestion(operationId: string) {
  return {
    operationId,
    type: "open",
    semanticKey: `question-${operationId}`,
    text: "Why did Mira stop at the door?",
    kind: "knowledge_gap",
    severity: "curiosity",
    evidence: [evidence()],
    rationale: "The scene establishes a meaningful unresolved question.",
    minimalClarification: null,
  };
}

describe("normalizeStepOutput", () => {
  it("builds a deterministic evidence-backed recovery for invalid provider output", () => {
    const recovered = buildSafeFallbackStepOutput(input);
    expect(validateStepOutput(input, recovered)).toEqual(recovered);
    expect(recovered.factsAdded).toHaveLength(1);
    expect(recovered.factsAdded[0]?.evidence[0]).toEqual({
      segmentId: input.currentSegment.id,
      startOffset: 0,
      endOffset: input.currentSegment.text.length,
      quote: input.currentSegment.text,
    });
    expect(recovered.questionOperations).toHaveLength(3);
    expect(recovered.warnings).toHaveLength(1);
  });

  it("salvages useful model questions and repairs them to exact evidence", () => {
    const recovered = buildSafeFallbackStepOutput(input, {
      questionOperations: [
        {
          text: "Why does Mira stop at the door?",
          evidence: [{ quote: "Mira" }],
        },
      ],
    });

    expect(validateStepOutput(input, recovered)).toEqual(recovered);
    expect(recovered.questionOperations[0]).toMatchObject({
      type: "open",
      text: "Why does Mira stop at the door?",
      evidence: [
        {
          segmentId: input.currentSegment.id,
          startOffset: 0,
          endOffset: 4,
          quote: "Mira",
        },
      ],
    });
  });

  it("turns a narrative reversal into a specific, grammatical audience question", () => {
    const storyInput: StepAnalysisInput = {
      ...input,
      currentOrdinal: 1,
      currentSegment: {
        ...input.currentSegment,
        text: "Kaelen fought until dawn. The Warlord’s horns sounded a retreat.",
      },
    };

    const recovered = buildSafeFallbackStepOutput(storyInput);

    expect(validateStepOutput(storyInput, recovered)).toEqual(recovered);
    expect(
      recovered.questionOperations.some(
        (operation) =>
          operation.type === "open" &&
          operation.text ===
            "What specifically causes the Warlord to retreat or change course at this point?",
      ),
    ).toBe(true);
  });

  it("covers broad-content and anonymous-narrative recovery paths", () => {
    const laterSpeech: StepAnalysisInput = {
      ...input,
      currentOrdinal: 2,
      currentSegment: {
        ...input.currentSegment,
        text: "The proposal adds a second supporting example without a conclusion.",
      },
    };
    const anonymousStory: StepAnalysisInput = {
      ...input,
      currentSegment: {
        ...input.currentSegment,
        text: '"go now!" a voice shouted. Two guards faced five attackers.',
      },
    };

    const speechResult = buildSafeFallbackStepOutput(laterSpeech);
    const storyResult = buildSafeFallbackStepOutput(anonymousStory);

    expect(validateStepOutput(laterSpeech, speechResult)).toEqual(speechResult);
    expect(validateStepOutput(anonymousStory, storyResult)).toEqual(storyResult);
    expect(speechResult.questionOperations[0]).toMatchObject({
      type: "open",
      text: "How does this section advance or qualify the central point established earlier?",
    });
    expect(storyResult.questionOperations[0]).toMatchObject({
      type: "open",
      text: "How can a group of two realistically withstand a group of five?",
    });
  });

  it("normalizes varied recovered question shapes without duplicating them", () => {
    const recovered = buildSafeFallbackStepOutput(input, [
      null,
      "not an object",
      {
        question: "Who is waiting beyond the door?",
        evidence: [null, { quote: "Mira" }],
      },
      {
        text: "When will Mira open the door?",
        evidence: [{ quote: "not present in the source" }],
      },
      {
        text: "Where does the door lead?",
        evidence: "invalid",
      },
      { text: "Who is waiting beyond the door?" },
      { text: "This is not a question" },
    ]);

    expect(validateStepOutput(input, recovered)).toEqual(recovered);
    expect(
      recovered.questionOperations.map((operation) =>
        operation.type === "open" ? operation.kind : null,
      ),
    ).toEqual(["identity", "timeline", "spatial_relation"]);
  });

  it("keeps fallback evidence exact when the section starts with whitespace", () => {
    const whitespaceInput = {
      ...input,
      currentSegment: {
        ...input.currentSegment,
        text: "\n\n  Mira stops. Later material follows.",
      },
    };
    const recovered = buildSafeFallbackStepOutput(whitespaceInput);
    expect(validateStepOutput(whitespaceInput, recovered)).toEqual(recovered);
    expect(recovered.factsAdded[0]?.evidence[0]).toMatchObject({
      startOffset: 4,
      quote: "Mira stops.",
    });
  });

  it("strips extras and repairs uniquely matchable evidence offsets", () => {
    const normalized = normalizeStepOutput(input, {
      schemaVersion: "1.0",
      requestId: "model_request_id",
      factsAdded: [
        {
          id: "fact_00000001",
          statement: "Mira stops at the door.",
          confidence: "explicit",
          evidence: [
            {
              segmentId: "wrong_segment",
              startOffset: 99,
              endOffset: 100,
              quote: "Mira",
              providerNote: "untrusted",
            },
          ],
          providerMetadata: "untrusted",
        },
      ],
      assumptionsAdded: [],
      assumptionUpdates: [],
      questionOperations: [],
      warnings: [],
      providerMetadata: "untrusted",
    });
    expect(validateStepOutput(input, normalized).factsAdded[0]?.evidence[0]).toEqual({
      segmentId: "segment_00000001",
      startOffset: 0,
      endOffset: 4,
      quote: "Mira",
    });
  });

  it("normalizes all supported operation shapes without inventing ambiguous evidence", () => {
    const normalizationInput = {
      ...input,
      currentSegment: { ...input.currentSegment, text: "Mira asks Leo." },
    };
    const normalized = normalizeStepOutput(normalizationInput, {
      schemaVersion: "1.0",
      requestId: "untrusted-request-id",
      factsAdded: [
        {
          id: "fact_00000001",
          statement: "Mira asks Leo.",
          confidence: "explicit",
          evidence: [{ ...evidence(), quote: "Mira", extra: true }],
          extra: true,
        },
      ],
      assumptionsAdded: [
        {
          id: "assumption_00000001",
          statement: "Leo knows Mira.",
          strength: "medium",
          evidence: [{ ...evidence(), quote: "Leo" }],
        },
      ],
      assumptionUpdates: [
        {
          id: "assumption_00000001",
          status: "confirmed",
          evidence: [],
          rationale: "The current scene provides direct support.",
        },
      ],
      questionOperations: [
        {
          ...openQuestion("operation_00000001"),
          evidence: [{ ...evidence(), quote: "Mira" }],
        },
        {
          operationId: "operation_00000002",
          type: "resolve",
          questionId: "question_00000001",
          evidence: [{ ...evidence(), quote: "Leo" }],
          rationale: "The scene answers the established question clearly.",
        },
      ],
      warnings: [],
    }) as Record<string, unknown>;

    expect(normalized["requestId"]).toBe(input.requestId);
    expect(normalized["factsAdded"]).toMatchObject([
      {
        evidence: [
          { segmentId: input.currentSegment.id, startOffset: 0, endOffset: 4 },
        ],
      },
    ]);
    expect(normalized["assumptionsAdded"]).toMatchObject([
      { evidence: [{ startOffset: 10, endOffset: 13, quote: "Leo" }] },
    ]);
    expect(normalized["questionOperations"]).toMatchObject([
      { type: "open", evidence: [{ startOffset: 0, endOffset: 4 }] },
      {
        type: "resolve",
        questionId: "question_00000001",
        evidence: [{ startOffset: 10, endOffset: 13 }],
      },
    ]);
    expect(normalizeStepOutput(normalizationInput, null)).toBeNull();
    expect(
      normalizeStepOutput(normalizationInput, {
        ...validOutput(),
        factsAdded: "not-an-array",
        assumptionsAdded: "not-an-array",
        assumptionUpdates: "not-an-array",
        questionOperations: "not-an-array",
      }),
    ).toMatchObject({ factsAdded: "not-an-array" });
  });

  it("rejects each model-output invariant that normalization must not bypass", () => {
    expect(() =>
      validateStepOutput(input, validOutput({ requestId: "request_00000002" })),
    ).toThrow(expect.objectContaining({ code: "INVARIANT_VIOLATION" }));

    expect(() =>
      validateStepOutput(
        { ...input, limits: { ...input.limits, maxOperations: 1 } },
        validOutput({
          questionOperations: [
            openQuestion("operation_00000001"),
            openQuestion("operation_00000002"),
          ],
        }),
      ),
    ).toThrow(expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }));

    expect(() =>
      validateStepOutput(
        { ...input, limits: { ...input.limits, maxNewQuestions: 0 } },
        validOutput({ questionOperations: [openQuestion("operation_00000001")] }),
      ),
    ).toThrow(expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }));

    expect(() =>
      validateStepOutput(
        input,
        validOutput({
          questionOperations: [
            {
              operationId: "operation_00000001",
              type: "resolve",
              questionId: "question_00000001",
              evidence: [],
              rationale: "The scene answers the established question clearly.",
            },
          ],
        }),
      ),
    ).toThrow(expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }));

    expect(() =>
      validateStepOutput(
        input,
        validOutput({
          factsAdded: [
            {
              id: "fact_00000001",
              statement: "Mira stops at the door.",
              confidence: "explicit",
              evidence: [evidence({ segmentId: "segment_00000002" })],
            },
          ],
        }),
      ),
    ).toThrow(expect.objectContaining({ code: "EVIDENCE_INVALID" }));

    expect(() =>
      validateStepOutput(
        input,
        validOutput({
          factsAdded: [
            {
              id: "fact_00000001",
              statement: "Mira stops at the door.",
              confidence: "explicit",
              evidence: [evidence({ startOffset: 1, endOffset: 5 })],
            },
          ],
        }),
      ),
    ).toThrow(expect.objectContaining({ code: "EVIDENCE_INVALID" }));

    expect(() =>
      validateStepOutput(
        input,
        validOutput({ warnings: ["Audience probability is unsupported."] }),
      ),
    ).toThrow(expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }));

    expect(() =>
      validateStepOutput(
        input,
        validOutput({ warnings: ["The system prompt must not be discussed."] }),
      ),
    ).toThrow(expect.objectContaining({ code: "MODEL_OUTPUT_INVALID" }));
  });

  it("preserves structured API errors and safely wraps unexpected failures", () => {
    const expected = new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "Invalid output.",
      false,
    );

    expect(asApiError(expected)).toBe(expected);
    expect(asApiError(new Error("unexpected"))).toMatchObject({
      code: "INTERNAL_ERROR",
      status: 500,
      retryable: false,
    });
    expect(asApiError(new DOMException("Timed out", "AbortError"))).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      status: 503,
      retryable: true,
    });
  });

  it("uses native JSON output for supported watsonx.ai model families", () => {
    expect(supportsJsonObjectOutput("meta-llama/llama-3-3-70b-instruct")).toBe(true);
    expect(supportsJsonObjectOutput("ibm/granite-4-h-small")).toBe(true);
    expect(supportsJsonObjectOutput("openai/gpt-oss-120b")).toBe(false);
  });
});
