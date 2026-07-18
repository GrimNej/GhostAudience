import type { StepAnalysisInput } from "@ghost-audience/contracts";

export function buildStepUserPrompt(input: StepAnalysisInput): string {
  return JSON.stringify(
    {
      task: "analyze_current_segment",
      outputSchemaVersion: input.schemaVersion,
      requestId: input.requestId,
      currentOrdinal: input.currentOrdinal,
      analysisPolicy: input.analysisPolicy,
      constraints: input.limits,
      priorAudienceState: input.priorAudienceState,
      activeQuestions: input.activeQuestions,
      currentSegment: {
        id: input.currentSegment.id,
        heading: input.currentSegment.heading,
        text: input.currentSegment.text,
      },
      requiredOutputShape: {
        schemaVersion: "1.0",
        requestId: input.requestId,
        factsAdded: [],
        assumptionsAdded: [],
        assumptionUpdates: [],
        questionOperations: [],
        warnings: [],
      },
      responseContract: {
        ids: "Every id and operationId is 8-128 characters using only letters, digits, underscores, or hyphens.",
        evidence: {
          requiredFor: ["factsAdded", "assumptionsAdded", "questionOperations"],
          shape: {
            segmentId: input.currentSegment.id,
            startOffset: "zero-based integer",
            endOffset: "exclusive integer",
            quote: "exact character-for-character substring of currentSegment.text",
          },
          rule: "Set startOffset and endOffset so currentSegment.text.slice(startOffset, endOffset) equals quote exactly.",
        },
        factsAddedItem: {
          id: "fact_0001",
          statement: "string (3-500 chars)",
          confidence: "explicit | strong_inference | weak_inference",
          evidence: ["one to three evidence spans"],
        },
        assumptionsAddedItem: {
          id: "assumption_0001",
          statement: "string (3-500 chars)",
          strength: "low | medium | high",
          evidence: ["one to three evidence spans"],
        },
        questionOperation: {
          open: {
            operationId: "operation_0001",
            type: "open",
            semanticKey: "string (3-240 chars)",
            text: "string (5-400 chars)",
            kind: "identity | motivation | causality | timeline | reference | world_rule | knowledge_gap | emotional_reaction | promise_payoff | possible_contradiction | stakes | spatial_relation | other",
            severity: "curiosity | clarity_risk | blocking_confusion",
            evidence: ["one to three evidence spans"],
            rationale: "string (10-800 chars)",
            minimalClarification: "string (3-500 chars) or null",
          },
          existing: {
            operationId: "operation_0001",
            type: "reinforce | partial_answer | resolve | contradict | mark_stale | reopen",
            questionId: "an id copied exactly from activeQuestions",
            evidence: ["zero to three evidence spans"],
            rationale: "string (10-800 chars)",
          },
        },
      },
    },
    null,
    2,
  );
}
