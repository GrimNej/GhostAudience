import type { Context } from "hono";
import { readTokenBudget } from "../budget/token-budget";
import type { Bindings, RuntimeConfig } from "../env";
import type { NarrativeModelProvider } from "../providers/model-provider";

interface Variables { readonly requestId: string; readonly runtimeConfig: RuntimeConfig; readonly anonymousSessionId: string; }
type Environment = { readonly Bindings: Bindings; readonly Variables: Variables };

export function capabilitiesHandler(provider: NarrativeModelProvider) {
  return async (context: Context<Environment>): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const [providerCapabilities, tokenBudget] = await Promise.all([
        provider.capabilities(controller.signal),
        readTokenBudget(context.env.CONTROL_DB, context.get("runtimeConfig")),
      ]);
      const config = context.get("runtimeConfig");
      return context.json({
        schemaVersion: "1.0",
        liveAnalysisEnabled: config.providerMode === "live" && tokenBudget.remainingBeforeHardStop > 0,
        providerMode: providerCapabilities.providerMode,
        providerId: providerCapabilities.providerId,
        modelId: providerCapabilities.modelId,
        modelCatalogVerifiedAt: providerCapabilities.checkedAt,
        maxSegmentCharacters: 12_000,
        maxOperations: 20,
        fixtureModeAvailable: config.fixtureModeAvailable,
        tokenBudget,
      });
    } finally {
      clearTimeout(timer);
    }
  };
}