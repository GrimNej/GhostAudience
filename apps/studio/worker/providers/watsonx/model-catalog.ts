import { ApiError } from "../../errors";
import type { LiveRuntimeConfig } from "../../env";
import { getIamToken } from "./iam-token-cache";
import { WatsonxModelCatalogSchema } from "./watsonx-schemas";

export async function assertModelAvailable(config: LiveRuntimeConfig, signal: AbortSignal): Promise<void> {
  const token = await getIamToken(config.watsonxApiKey);
  const url = new URL("/ml/v1/foundation_model_specs", config.watsonxBaseUrl);
  url.searchParams.set("version", config.watsonxApiVersion);
  url.searchParams.set("filters", "function_text_chat");

  const response = await fetch(url, {
    headers: { accept: "application/json", authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) {
    throw new ApiError("PROVIDER_UNAVAILABLE", 502, "The watsonx.ai model catalog could not be checked.", response.status >= 500);
  }
  const catalog = WatsonxModelCatalogSchema.parse(await response.json());
  if (!catalog.resources.some((resource) => resource.model_id === config.watsonxModelId)) {
    throw new ApiError("MODEL_NOT_AVAILABLE", 503, "The configured Granite model is unavailable to this account and endpoint.", false);
  }
}