import type { StepAnalysisInput } from "@ghost-audience/contracts";
import { buildStepUserPrompt } from "./step.user.v1";

export function buildStepRetryUserPrompt(
  input: StepAnalysisInput,
  validationError: string,
): string {
  return `${buildStepUserPrompt(input)}\n\n${JSON.stringify(
    {
      retryInstruction:
        "Regenerate the entire response from the supplied input. The previous response was rejected; do not repair it or refer to it.",
      previousValidationError: validationError.slice(0, 4_000),
      priority:
        "A small fully valid, useful response is better than an invalid detailed response. Return at least one explicit fact with one distinctive exact quote for a segment containing a concrete point. Add an audience question when the content creates genuine confusion, curiosity, a missing definition, an unsupported leap, or an anticipated Q&A topic.",
    },
    null,
    2,
  )}`;
}
