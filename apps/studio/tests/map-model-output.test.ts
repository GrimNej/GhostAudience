import type { StepAnalysisOutput } from "@ghost-audience/contracts";
import {
  createEmptyAudienceState,
  replayQuestionEvents,
  runId,
  segmentId,
} from "@ghost-audience/domain";
import { describe, expect, it } from "vitest";
import { mapModelOutput } from "../src/features/analysis/domain/map-model-output";

const segment = {
  id: segmentId("segment_00000001"),
  ordinal: 0,
  kind: "scene" as const,
  heading: null,
  text: "Mira stops. Tomas waits.",
  globalStartOffset: 0,
  globalEndOffset: 24,
  sha256: "a".repeat(64),
};

const transportSegmentId = "transport_segment_0001";
const laterSegment = {
  ...segment,
  id: segmentId("segment_00000002"),
  ordinal: 1,
};
const laterTransportSegmentId = "transport_segment_0002";

function evidence(startOffset: number, endOffset: number, quote: string) {
  return [{ segmentId: transportSegmentId, startOffset, endOffset, quote }];
}

function repeatedModelIdsOutput(): StepAnalysisOutput {
  return {
    schemaVersion: "1.0",
    requestId: "request_00000001",
    factsAdded: [
      {
        id: "fact_0001",
        statement: "Mira stops.",
        confidence: "explicit",
        evidence: evidence(0, 11, "Mira stops."),
      },
      {
        id: "fact_0001",
        statement: "Tomas waits.",
        confidence: "explicit",
        evidence: evidence(12, 24, "Tomas waits."),
      },
    ],
    assumptionsAdded: [],
    assumptionUpdates: [],
    questionOperations: [
      {
        operationId: "operation_0001",
        type: "open",
        semanticKey: "motivation|mira|stops",
        text: "Why does Mira stop?",
        kind: "motivation",
        severity: "curiosity",
        evidence: evidence(0, 11, "Mira stops."),
        rationale: "The reason for Mira stopping is not yet explained.",
        minimalClarification: null,
      },
      {
        operationId: "operation_0001",
        type: "open",
        semanticKey: "motivation|tomas|waits",
        text: "Why does Tomas wait?",
        kind: "motivation",
        severity: "curiosity",
        evidence: evidence(12, 24, "Tomas waits."),
        rationale: "The reason for Tomas waiting is not yet explained.",
        minimalClarification: null,
      },
    ],
    warnings: [],
  };
}

describe("mapModelOutput", () => {
  it("canonicalizes repeated model IDs before replay and persistence", async () => {
    const initial = createEmptyAudienceState(runId("run_00000000000000000001"));
    const mapped = await mapModelOutput(
      repeatedModelIdsOutput(),
      initial,
      segment,
      transportSegmentId,
    );

    expect(new Set(mapped.questionEvents.map((event) => event.operationId)).size).toBe(
      2,
    );
    expect(mapped.questionEvents.map((event) => event.operationId)).not.toContain(
      "operation_0001",
    );
    expect(new Set(mapped.facts.map((fact) => fact.id)).size).toBe(2);
    expect(mapped.facts.map((fact) => fact.id)).not.toContain("fact_0001");

    const replayed = replayQuestionEvents(initial, mapped.questionEvents, {
      currentOrdinal: 0,
      staleAfterSegments: 3,
      segments: [segment],
    });
    expect(replayed.questions).toHaveLength(2);
  });

  it("scopes canonical IDs to the run", async () => {
    const first = await mapModelOutput(
      repeatedModelIdsOutput(),
      createEmptyAudienceState(runId("run_00000000000000000001")),
      segment,
      transportSegmentId,
    );
    const second = await mapModelOutput(
      repeatedModelIdsOutput(),
      createEmptyAudienceState(runId("run_00000000000000000002")),
      segment,
      transportSegmentId,
    );

    expect(first.questionEvents[0]?.operationId).not.toBe(
      second.questionEvents[0]?.operationId,
    );
    expect(first.facts[0]?.id).not.toBe(second.facts[0]?.id);
  });

  it("turns repeated semantic questions in one response into reinforcement", async () => {
    const output = repeatedModelIdsOutput();
    const firstQuestion = output.questionOperations[0];
    const secondQuestion = output.questionOperations[1];
    if (firstQuestion?.type !== "open" || secondQuestion?.type !== "open") {
      throw new Error("Question fixtures must open questions.");
    }
    const mapped = await mapModelOutput(
      {
        ...output,
        factsAdded: [],
        questionOperations: [
          firstQuestion,
          {
            ...secondQuestion,
            semanticKey: firstQuestion.semanticKey,
          },
        ],
      },
      createEmptyAudienceState(runId("run_00000000000000000001")),
      segment,
      transportSegmentId,
    );

    expect(mapped.questionEvents.map((event) => event.type)).toEqual([
      "QUESTION_OPENED",
      "QUESTION_REINFORCED",
    ]);
  });

  it("maps an assumption addition and same-response update to one stable ID", async () => {
    const output = repeatedModelIdsOutput();
    const mapped = await mapModelOutput(
      {
        ...output,
        factsAdded: [],
        questionOperations: [],
        assumptionsAdded: [
          {
            id: "assumption_0001",
            statement: "Mira may be afraid to proceed.",
            strength: "medium",
            evidence: evidence(0, 11, "Mira stops."),
          },
        ],
        assumptionUpdates: [
          {
            id: "assumption_0001",
            status: "confirmed",
            evidence: evidence(0, 11, "Mira stops."),
            rationale: "The current action supports the audience assumption.",
          },
        ],
      },
      createEmptyAudienceState(runId("run_00000000000000000001")),
      segment,
      transportSegmentId,
    );

    expect(mapped.assumptions).toHaveLength(1);
    expect(mapped.assumptions[0]).toMatchObject({ status: "confirmed" });
    expect(mapped.assumptions[0]?.id).not.toBe("assumption_0001");
  });

  it.each(["refuted", "expired"] as const)(
    "maps a same-response assumption update to %s",
    async (status) => {
      const output = repeatedModelIdsOutput();
      const mapped = await mapModelOutput(
        {
          ...output,
          factsAdded: [],
          questionOperations: [],
          assumptionsAdded: [
            {
              id: "assumption_0001",
              statement: "Mira may be afraid to proceed.",
              strength: "medium",
              evidence: evidence(0, 11, "Mira stops."),
            },
          ],
          assumptionUpdates: [
            {
              id: "assumption_0001",
              status,
              evidence: evidence(0, 11, "Mira stops."),
              rationale: "The current section changes the audience assumption.",
            },
          ],
        },
        createEmptyAudienceState(runId("run_00000000000000000001")),
        segment,
        transportSegmentId,
      );

      expect(mapped.assumptions[0]?.status).toBe(status);
    },
  );

  it("maps every existing-question operation without trusting its model ID", async () => {
    const initial = createEmptyAudienceState(runId("run_00000000000000000001"));
    const openingOutput = repeatedModelIdsOutput();
    const opening = await mapModelOutput(
      {
        ...openingOutput,
        factsAdded: [],
        questionOperations: openingOutput.questionOperations.slice(0, 1),
      },
      initial,
      segment,
      transportSegmentId,
    );
    const prior = replayQuestionEvents(initial, opening.questionEvents, {
      currentOrdinal: 0,
      staleAfterSegments: 3,
      segments: [segment, laterSegment],
    });
    const question = prior.questions[0];
    if (question === undefined)
      throw new Error("Opening fixture did not create a question.");
    const laterEvidence = [
      {
        segmentId: laterTransportSegmentId,
        startOffset: 0,
        endOffset: 11,
        quote: "Mira stops.",
      },
    ];
    const common = {
      questionId: question.id,
      evidence: laterEvidence,
      rationale: "The current section changes how the audience reads this question.",
    };
    const mapped = await mapModelOutput(
      {
        schemaVersion: "1.0",
        requestId: "request_00000002",
        factsAdded: [],
        assumptionsAdded: [],
        assumptionUpdates: [],
        questionOperations: [
          { ...common, operationId: "operation_shared", type: "reinforce" },
          { ...common, operationId: "operation_shared", type: "partial_answer" },
          { ...common, operationId: "operation_shared", type: "resolve" },
          { ...common, operationId: "operation_shared", type: "contradict" },
          {
            ...common,
            operationId: "operation_shared",
            type: "mark_stale",
            evidence: [],
          },
          { ...common, operationId: "operation_shared", type: "reopen" },
        ],
        warnings: [],
      },
      prior,
      laterSegment,
      laterTransportSegmentId,
    );

    expect(mapped.questionEvents.map((event) => event.type)).toEqual([
      "QUESTION_REINFORCED",
      "QUESTION_PARTIALLY_ANSWERED",
      "QUESTION_RESOLVED",
      "QUESTION_CONTRADICTED",
      "QUESTION_MARKED_STALE",
      "QUESTION_REOPENED",
    ]);
    expect(new Set(mapped.questionEvents.map((event) => event.operationId)).size).toBe(
      6,
    );
  });

  it("rejects an update for an unknown question", async () => {
    const output = repeatedModelIdsOutput();
    await expect(
      mapModelOutput(
        {
          ...output,
          factsAdded: [],
          questionOperations: [
            {
              operationId: "operation_unknown",
              type: "reinforce",
              questionId: "question_unknown",
              evidence: evidence(0, 11, "Mira stops."),
              rationale: "The model referenced a question that was never opened.",
            },
          ],
        },
        createEmptyAudienceState(runId("run_00000000000000000001")),
        segment,
        transportSegmentId,
      ),
    ).rejects.toThrow(/unknown question/iu);
  });

  it("rejects an update for an unknown assumption", async () => {
    const output = repeatedModelIdsOutput();
    await expect(
      mapModelOutput(
        {
          ...output,
          factsAdded: [],
          questionOperations: [],
          assumptionUpdates: [
            {
              id: "assumption_unknown",
              status: "confirmed",
              evidence: evidence(0, 11, "Mira stops."),
              rationale: "The model referenced an assumption that was never added.",
            },
          ],
        },
        createEmptyAudienceState(runId("run_00000000000000000001")),
        segment,
        transportSegmentId,
      ),
    ).rejects.toThrow(/unknown assumption/iu);
  });
});
