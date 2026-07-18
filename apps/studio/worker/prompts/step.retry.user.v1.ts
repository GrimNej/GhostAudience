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
        "A small fully valid response is better than an invalid detailed response. Empty arrays are allowed only when the segment contains no grounded finding of that kind; warnings are not a substitute for an explicit fact or a grounded unresolved question.",
    },
    null,
    2,
  )}`;
}
