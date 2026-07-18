import type { StepAnalysisInput } from "@ghost-audience/contracts";

export function buildStepUserPrompt(
  input: StepAnalysisInput,
): string {
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
    },
    null,
    2,
  );
}