import { ApiError } from "../errors";

function stripCodeFence(value: string): string {
  const trimmed = value.trim();

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return fenced?.[1]?.trim() ?? trimmed;
}

function locateJsonObject(value: string): string {
  const first = value.indexOf("{");
  const last = value.lastIndexOf("}");

  if (first === -1 || last === -1 || last < first) {
    throw new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "The model response did not contain a JSON object.",
      false,
    );
  }

  return value.slice(first, last + 1);
}

export function parseJsonContent(content: string): unknown {
  const stripped = stripCodeFence(content);

  const candidates = [stripped, locateJsonObject(stripped)];

  let finalError: unknown = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch (error) {
      finalError = error;
    }
  }

  throw new ApiError(
    "MODEL_OUTPUT_INVALID",
    502,
    finalError instanceof Error
      ? `The model returned invalid JSON: ${finalError.message}`
      : "The model returned invalid JSON.",
    false,
  );
}
