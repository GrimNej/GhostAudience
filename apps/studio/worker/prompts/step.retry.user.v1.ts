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
        "A small fully valid, useful response is better than an invalid detailed response. For an eventful segment, return at least one explicit fact with one distinctive exact quote; use empty arrays only when no concrete fact can be supported.",
    },
    null,
    2,
  )}`;
}
