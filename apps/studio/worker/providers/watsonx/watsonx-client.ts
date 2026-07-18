import type { LiveRuntimeConfig } from "../../env";
import { ApiError } from "../../errors";
import { getIamToken, invalidateIamToken } from "./iam-token-cache";
import { WatsonxChatResponseSchema } from "./watsonx-schemas";

interface WatsonxMessage {
  readonly role: "system" | "user";
  readonly content: string;
}
export interface WatsonxChatRequest {
  readonly messages: readonly WatsonxMessage[];
  readonly maxTokens: number;
  readonly temperature: number;
  readonly timeLimitMilliseconds: number;
}
export interface WatsonxChatResult {
  readonly content: string;
  readonly promptTokens: number | null;
  readonly completionTokens: number | null;
  readonly totalTokens: number | null;
}

function isGptOssModel(modelId: string): boolean {
  return modelId.startsWith("openai/gpt-oss-");
}

function mapProviderFailure(status: number): ApiError {
  if (status === 401 || status === 403)
    return new ApiError(
      "PROVIDER_AUTH_FAILED",
      502,
      "watsonx.ai rejected the configured credentials.",
      false,
    );
  if (status === 402 || status === 429)
    return new ApiError(
      "PROVIDER_QUOTA_EXHAUSTED",
      503,
      "The free watsonx.ai allowance is unavailable or exhausted.",
      false,
    );
  if (status === 404)
    return new ApiError(
      "MODEL_NOT_AVAILABLE",
      503,
      "The configured watsonx.ai model is unavailable.",
      false,
    );
  return new ApiError(
    "PROVIDER_UNAVAILABLE",
    502,
    "watsonx.ai is temporarily unavailable.",
    status >= 500,
  );
}

async function execute(
  config: LiveRuntimeConfig,
  input: WatsonxChatRequest,
  signal: AbortSignal,
  allowAuthRetry: boolean,
): Promise<WatsonxChatResult> {
  const token = await getIamToken(config.watsonxApiKey);
  const url = new URL("/ml/v1/text/chat", config.watsonxBaseUrl);
  url.searchParams.set("version", config.watsonxApiVersion);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model_id: config.watsonxModelId,
      project_id: config.watsonxProjectId,
      messages: input.messages,
      temperature: input.temperature,
      time_limit: input.timeLimitMilliseconds,
      ...(isGptOssModel(config.watsonxModelId)
        ? {
            chat_template_kwargs: { thinking: false },
            max_completion_tokens: input.maxTokens,
            reasoning_effort: "low",
          }
        : {
            max_tokens: input.maxTokens,
            response_format: { type: "json_object" },
          }),
    }),
    signal,
  });

  if ((response.status === 401 || response.status === 403) && allowAuthRetry) {
    invalidateIamToken();
    return execute(config, input, signal, false);
  }
  if (!response.ok) throw mapProviderFailure(response.status);

  const parsed = WatsonxChatResponseSchema.parse(await response.json());
  const choice = parsed.choices[0];
  const content = choice?.message.content;
  if (content === undefined || content === null || content.trim().length === 0)
    throw new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "watsonx.ai returned no usable response content.",
      false,
    );
  return {
    content,
    promptTokens: parsed.usage?.prompt_tokens ?? null,
    completionTokens: parsed.usage?.completion_tokens ?? null,
    totalTokens: parsed.usage?.total_tokens ?? null,
  };
}

export function watsonxChat(
  config: LiveRuntimeConfig,
  input: WatsonxChatRequest,
  signal: AbortSignal,
): Promise<WatsonxChatResult> {
  return execute(config, input, signal, true);
}
