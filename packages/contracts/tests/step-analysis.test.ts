import { describe, expect, it } from "vitest";
import { StepAnalysisInputSchema } from "../src/index.js";

const hash = "a".repeat(64);

const validInput = {
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
  analysisPolicy: {
    preservePlausibleAmbiguity: true,
    avoidAudienceProbabilities: true,
    requireEvidence: true,
    ignoreExternalStoryKnowledge: true,
  },
  activeQuestions: [],
  limits: {
    maxNewQuestions: 8,
    maxOperations: 20,
  },
} as const;

describe("StepAnalysisInputSchema", () => {
  it("accepts the legal no-hindsight shape", () => {
    expect(StepAnalysisInputSchema.parse(validInput)).toEqual(validInput);
  });

  it.each([
    "fullScript",
    "remainingSegments",
    "nextSegment",
    "ending",
    "globalSummary",
    "futureCharacters",
    "scriptHash",
    "intentContract",
  ])("rejects forbidden extra key %s", (key) => {
    expect(() =>
      StepAnalysisInputSchema.parse({
        ...validInput,
        [key]: "forbidden",
      }),
    ).toThrow();
  });
});
