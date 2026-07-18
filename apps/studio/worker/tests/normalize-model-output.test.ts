import type { StepAnalysisInput } from "@ghost-audience/contracts";
import { describe, expect, it } from "vitest";
import { normalizeStepOutput } from "../validation/normalize-step-output";
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

describe("normalizeStepOutput", () => {
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
});
