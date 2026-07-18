import type {
  FinalizeRunInput,
  FinalizeRunOutput,
  StepAnalysisInput,
  StepAnalysisOutput,
} from "@ghost-audience/contracts";
import { ApiError } from "../errors";
import type {
  ModelCapabilities,
  NarrativeModelProvider,
  ProviderResult,
} from "./model-provider";

export class DisabledProvider implements NarrativeModelProvider {
  public readonly providerId = "disabled";
  public async analyzeStep(
    _input: StepAnalysisInput,
    _signal: AbortSignal,
  ): Promise<ProviderResult<StepAnalysisOutput>> {
    throw new ApiError(
      "PROVIDER_DISABLED",
      503,
      "Live analysis is disabled for this deployment.",
      false,
    );
  }
  public async finalizeRun(
    _input: FinalizeRunInput,
    _signal: AbortSignal,
  ): Promise<ProviderResult<FinalizeRunOutput>> {
    throw new ApiError(
      "PROVIDER_DISABLED",
      503,
      "Live finalization is disabled for this deployment.",
      false,
    );
  }
  public async capabilities(): Promise<ModelCapabilities> {
    return {
      providerId: this.providerId,
      providerMode: "disabled",
      modelId: null,
      modelAvailable: false,
      checkedAt: new Date().toISOString(),
      promptVersions: { step: "disabled", finalize: "disabled" },
    };
  }
}
