import { ApiError } from "../errors";

const probabilityPattern =
  /\b(?:\d{1,3}(?:\.\d+)?\s*%|probability|viewers will|audience score)\b/i;

const systemPromptPattern =
  /\b(?:system prompt|hidden instruction|developer message)\b/i;

export function assertNoForbiddenClaims(
  value: unknown,
): void {
  const serialized = JSON.stringify(value);

  if (probabilityPattern.test(serialized)) {
    throw new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "The model emitted an unsupported audience-probability claim.",
      false,
    );
  }

  if (systemPromptPattern.test(serialized)) {
    throw new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "The model response appears to expose or discuss hidden instructions.",
      false,
    );
  }
}