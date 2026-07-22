import type { StepAnalysisInput } from "@ghost-audience/contracts";
import { describe, expect, it } from "vitest";
import { FixtureProvider } from "../providers/fixture/fixture-provider";

function inputFor(ordinal: number): StepAnalysisInput {
  const text = `Paragraph ${ordinal + 1} introduces a completely arbitrary audience-visible idea for capacity testing.`;
  return {
    schemaVersion: "1.0",
    requestId: `request_fixture_${String(ordinal).padStart(4, "0")}`,
    idempotencyKey: String(ordinal % 10).repeat(64),
    runId: "run_fixture_00000001",
    currentOrdinal: ordinal,
    priorPrefixHash: "a".repeat(64),
    expectedNextPrefixHash: "b".repeat(64),
    currentSegment: {
      id: `segment_fixture_${String(ordinal).padStart(4, "0")}`,
      heading: null,
      text,
      sha256: "c".repeat(64),
    },
    priorAudienceState: {
      processedThroughOrdinal: ordinal - 1,
      facts: [],
      assumptions: [],
      compactNarrativeState: "No prior fixture state is required.",
    },
    activeQuestions: [],
    analysisPolicy: {
      preservePlausibleAmbiguity: true,
      avoidAudienceProbabilities: true,
      requireEvidence: true,
      ignoreExternalStoryKnowledge: true,
    },
    limits: { maxNewQuestions: 12, maxOperations: 20 },
  };
}

describe("FixtureProvider", () => {
  it("grounds deterministic preview output in arbitrary content across ten sections", async () => {
    const provider = new FixtureProvider();
    const operationIds: string[] = [];

    for (let ordinal = 0; ordinal < 10; ordinal += 1) {
      const input = inputFor(ordinal);
      const result = await provider.analyzeStep(input);
      const question = result.output.questionOperations[0];
      const fact = result.output.factsAdded[0];
      if (question === undefined || fact === undefined) {
        throw new Error("Generic fixture output must include a fact and question.");
      }
      operationIds.push(question.operationId);
      for (const span of [...question.evidence, ...fact.evidence]) {
        expect(input.currentSegment.text.slice(span.startOffset, span.endOffset)).toBe(
          span.quote,
        );
      }
    }

    expect(new Set(operationIds).size).toBe(10);
  });

  it("retains the curated demo response when its exact evidence is present", async () => {
    const provider = new FixtureProvider();
    const input = inputFor(0);
    const result = await provider.analyzeStep({
      ...input,
      currentSegment: {
        ...input.currentSegment,
        text: 'Mira looked at the house. "Not again."',
      },
    });

    expect(result.output.questionOperations[0]).toMatchObject({
      type: "open",
      text: "Why does Mira recognize the house?",
    });
  });

  it("updates the canonical prior assumption ID in the final demo section", async () => {
    const provider = new FixtureProvider();
    const input = inputFor(2);
    const canonicalAssumptionId = "assumption_2fd5834f2d31";
    const result = await provider.analyzeStep({
      ...input,
      currentSegment: {
        ...input.currentSegment,
        text: 'Mira found a photograph beside her older sister, Anya. "Anya brought me here the night the archive burned."',
      },
      priorAudienceState: {
        ...input.priorAudienceState,
        assumptions: [
          {
            id: canonicalAssumptionId,
            statement: "Mira may have been at the house before.",
            strength: "high",
            status: "active",
          },
        ],
      },
    });

    expect(result.output.assumptionUpdates).toEqual([
      expect.objectContaining({
        id: canonicalAssumptionId,
        status: "confirmed",
      }),
    ]);
  });

  it("finishes the demo safely when prior assumption state is unavailable", async () => {
    const provider = new FixtureProvider();
    const input = inputFor(2);
    const result = await provider.analyzeStep({
      ...input,
      currentSegment: {
        ...input.currentSegment,
        text: "Anya brought me here the night the archive burned. A photograph showed Mira beside her older sister, Anya.",
      },
    });

    expect(result.output.assumptionUpdates).toEqual([]);
    expect(result.output.factsAdded).toHaveLength(1);
  });
});
