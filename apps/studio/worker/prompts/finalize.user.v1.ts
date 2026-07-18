import type { FinalizeRunInput } from "@ghost-audience/contracts";

export function buildFinalizeUserPrompt(input: FinalizeRunInput): string {
  return JSON.stringify(
    {
      task: "summarize_validated_run",
      requestId: input.requestId,
      projectTitle: input.projectTitle,
      intentContract: input.intentContract,
      metrics: input.metrics,
      questions: input.questions,
      requiredOutputShape: {
        schemaVersion: "1.0",
        requestId: input.requestId,
        executiveSummary: "",
        strongestCuriosityArcs: [],
        blockingConfusions: [],
        lateResolutions: [],
        abandonedPromises: [],
        intentAlignment: [],
        limitations: [],
      },
    },
    null,
    2,
  );
}
