import { ApiError } from "../../errors";
import type { WatsonxChatRequest, WatsonxChatResult } from "../watsonx/watsonx-client";

export const cloudflareFallbackModelId = "@cf/meta/llama-3.1-8b-instruct-fast" as const;

function responseContent(result: unknown): string | undefined {
  if (typeof result === "string") return result;
  if (typeof result !== "object" || result === null) return undefined;

  const record = result as Record<string, unknown>;
  if (typeof record["response"] === "string") return record["response"];
  if (typeof record["response"] === "object" && record["response"] !== null) {
    return JSON.stringify(record["response"]);
  }

  // Workers AI JSON mode can return the requested object directly even though
  // the generated binding type currently describes it as a response string.
  if (record["schemaVersion"] === "1.0") return JSON.stringify(record);
  return undefined;
}

function responseUsage(result: unknown): {
  readonly prompt_tokens?: number;
  readonly completion_tokens?: number;
  readonly total_tokens?: number;
} | null {
  if (typeof result !== "object" || result === null) return null;
  const usage = (result as Record<string, unknown>)["usage"];
  return typeof usage === "object" && usage !== null
    ? (usage as {
        readonly prompt_tokens?: number;
        readonly completion_tokens?: number;
        readonly total_tokens?: number;
      })
    : null;
}

/**
 * Runs the same evidence-first prompt on Workers AI when the primary provider
 * cannot serve a request. Keeping this behind the Worker means a temporary
 * upstream outage never strands an audience read in the browser.
 */
export async function cloudflareAiChat(
  ai: Ai,
  input: WatsonxChatRequest,
  signal: AbortSignal,
): Promise<WatsonxChatResult> {
  try {
    const result = await ai.run(
      cloudflareFallbackModelId,
      {
        messages: input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        response_format: { type: "json_object" },
        max_tokens: input.maxTokens,
        temperature: input.temperature,
      },
      {
        signal,
        tags: ["ghost-audience", "provider-fallback"],
      },
    );

    const content = responseContent(result);
    if (content === undefined || content.trim().length === 0) {
      throw new ApiError(
        "MODEL_OUTPUT_INVALID",
        502,
        "The backup audience model returned no usable response content.",
        true,
      );
    }

    const usage = responseUsage(result);
    return {
      content,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens: usage?.completion_tokens ?? null,
      totalTokens: usage?.total_tokens ?? null,
    };
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      throw error;
    }
    throw new ApiError(
      "PROVIDER_UNAVAILABLE",
      503,
      "The connected audience models are temporarily unavailable.",
      true,
    );
  }
}
