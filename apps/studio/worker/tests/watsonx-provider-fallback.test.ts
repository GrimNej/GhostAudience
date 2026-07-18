import type { FinalizeRunInput, StepAnalysisInput } from "@ghost-audience/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveRuntimeConfig } from "../env";
import { ApiError } from "../errors";
import { cloudflareFallbackModelId } from "../providers/cloudflare/cloudflare-ai-client";

const { watsonxChat } = vi.hoisted(() => ({ watsonxChat: vi.fn() }));

vi.mock("../providers/watsonx/watsonx-client", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../providers/watsonx/watsonx-client")>();
  return {
    ...original,
    watsonxChat,
  };
});

const hash = "a".repeat(64);
const input: StepAnalysisInput = {
  schemaVersion: "1.0",
  requestId: "request_fallback_01",
  idempotencyKey: hash,
  runId: "run_fallback_0001",
  currentOrdinal: 0,
  priorPrefixHash: hash,
  expectedNextPrefixHash: hash,
  currentSegment: {
    id: "segment_fallback_01",
    heading: null,
    text: "The proposal promises a safer crossing but never explains its cost.",
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

const config: LiveRuntimeConfig = {
  environment: "test",
  providerMode: "live",
  allowedOrigins: ["https://example.test"],
  rateLimitWindowSeconds: 600,
  rateLimitMaxRequests: 30,
  dailyRequestLimit: 150,
  monthlyTokenAllowance: 300_000,
  tokenBudgetHardStop: 240_000,
  fixtureModeAvailable: true,
  rateLimitSalt: "s".repeat(32),
  sessionSigningSecret: "x".repeat(32),
  watsonxApiKey: "watsonx-test-key",
  watsonxProjectId: "watsonx-test-project",
  watsonxBaseUrl: "https://us-south.ml.cloud.ibm.com",
  watsonxModelId: "meta-llama/llama-3-3-70b-instruct",
  watsonxApiVersion: "2025-10-25",
};

function backupResponse(): string {
  const quote = "never explains its cost";
  const startOffset = input.currentSegment.text.indexOf(quote);
  const evidence = {
    segmentId: input.currentSegment.id,
    startOffset,
    endOffset: startOffset + quote.length,
    quote,
  };
  return JSON.stringify({
    schemaVersion: "1.0",
    requestId: input.requestId,
    factsAdded: [
      {
        id: "fact_fallback_0001",
        statement: "The proposal promises a safer crossing.",
        confidence: "explicit",
        evidence: [evidence],
      },
    ],
    assumptionsAdded: [],
    assumptionUpdates: [],
    questionOperations: [
      {
        operationId: "operation_fallback_0001",
        type: "open",
        semanticKey: "proposal-cost",
        text: "What will the safer crossing cost?",
        kind: "knowledge_gap",
        severity: "clarity_risk",
        evidence: [evidence],
        rationale: "The proposal names a benefit without giving its practical cost.",
        minimalClarification:
          "State the expected cost or explain when it will be known.",
      },
    ],
    warnings: [],
  });
}

function modelResult(content: string) {
  return {
    content,
    promptTokens: 120,
    completionTokens: 80,
    totalTokens: 200,
  };
}

const finalizeInput: FinalizeRunInput = {
  schemaVersion: "1.0",
  requestId: "request_finalize_01",
  scriptHash: hash,
  projectTitle: "A test project",
  intentContract: {
    requiredKnowledge: [],
    desiredQuestions: [],
    forbiddenAssumptions: [],
    intentionalMysteries: [],
    intendedEmotionalDirection: null,
    desiredUnresolvedQuestions: [],
  },
  metrics: {
    segmentCount: 1,
    questionCount: 0,
    openCount: 0,
    resolvedCount: 0,
    blockingCount: 0,
  },
  questions: [],
};

function finalizeResponse(): string {
  return JSON.stringify({
    schemaVersion: "1.0",
    requestId: finalizeInput.requestId,
    executiveSummary: "The audience read completed with a clear central throughline.",
    strongestCuriosityArcs: [],
    blockingConfusions: [],
    lateResolutions: [],
    abandonedPromises: [],
    intentAlignment: [],
    limitations: ["This is a simulated first-audience perspective."],
  });
}

describe("WatsonxProvider continuity", () => {
  beforeEach(() => {
    watsonxChat.mockReset();
  });

  it.each([
    [
      "an upstream outage",
      new ApiError(
        "PROVIDER_UNAVAILABLE",
        502,
        "watsonx.ai is temporarily unavailable.",
        true,
      ),
    ],
    ["a primary timeout", new DOMException("Primary window elapsed.", "TimeoutError")],
  ])("continues with Workers AI after %s", async (_scenario, primaryFailure) => {
    watsonxChat.mockRejectedValue(primaryFailure);
    const run = vi.fn().mockResolvedValue({
      response: JSON.parse(backupResponse()) as unknown,
      usage: { prompt_tokens: 120, completion_tokens: 80, total_tokens: 200 },
    });
    const { WatsonxProvider } = await import("../providers/watsonx/watsonx-provider");

    const result = await new WatsonxProvider(config, {
      run,
    } as unknown as Ai).analyzeStep(input, new AbortController().signal);

    expect(result.output.questionOperations[0]).toMatchObject({
      type: "open",
      text: "What will the safer crossing cost?",
    });
    expect(result.output.warnings).toContain(
      "IBM watsonx.ai was temporarily unavailable, so this section continued on the backup audience model.",
    );
    expect(run).toHaveBeenCalledWith(
      cloudflareFallbackModelId,
      expect.objectContaining({ response_format: { type: "json_object" } }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("accepts a valid primary response without invoking the backup", async () => {
    watsonxChat.mockResolvedValue(modelResult(backupResponse()));
    const run = vi.fn();
    const { WatsonxProvider } = await import("../providers/watsonx/watsonx-provider");

    const result = await new WatsonxProvider(config, {
      run,
    } as unknown as Ai).analyzeStep(input, new AbortController().signal);

    expect(result.output.questionOperations).toHaveLength(1);
    expect(result.output.warnings).toEqual([]);
    expect(result.usage.totalTokens).toBe(200);
    expect(run).not.toHaveBeenCalled();
  });

  it("repairs an invalid primary response and combines token usage", async () => {
    watsonxChat
      .mockResolvedValueOnce(modelResult("not json"))
      .mockResolvedValueOnce(modelResult(backupResponse()));
    const { WatsonxProvider } = await import("../providers/watsonx/watsonx-provider");

    const result = await new WatsonxProvider(config).analyzeStep(
      input,
      new AbortController().signal,
    );

    expect(watsonxChat).toHaveBeenCalledTimes(2);
    expect(result.output.questionOperations).toHaveLength(1);
    expect(result.usage.totalTokens).toBe(400);
  });

  it("commits evidence-backed questions when both model formats are invalid", async () => {
    watsonxChat.mockResolvedValue(modelResult("{}"));
    const { WatsonxProvider } = await import("../providers/watsonx/watsonx-provider");

    const result = await new WatsonxProvider(config).analyzeStep(
      input,
      new AbortController().signal,
    );

    expect(result.output.factsAdded).toHaveLength(1);
    expect(result.output.questionOperations).toHaveLength(3);
    expect(result.output.warnings[0]).toContain("repaired");
  });

  it("validates final summaries and rejects malformed final output", async () => {
    watsonxChat.mockResolvedValueOnce(modelResult(finalizeResponse()));
    const { WatsonxProvider } = await import("../providers/watsonx/watsonx-provider");
    const provider = new WatsonxProvider(config);

    const result = await provider.finalizeRun(
      finalizeInput,
      new AbortController().signal,
    );
    expect(result.output.executiveSummary).toContain("central throughline");

    watsonxChat.mockResolvedValueOnce(modelResult("{}"));
    await expect(
      provider.finalizeRun(finalizeInput, new AbortController().signal),
    ).rejects.toMatchObject({ code: "MODEL_OUTPUT_INVALID" });
  });
});
