import type {
  FinalizeRunInput,
  FinalizeRunOutput,
  StepAnalysisInput,
  StepAnalysisOutput,
} from "@ghost-audience/contracts";

export interface ProviderUsage {
  readonly promptTokens: number | null;
  readonly completionTokens: number | null;
  readonly totalTokens: number | null;
}

export interface ProviderResult<T> {
  readonly output: T;
  readonly usage: ProviderUsage;
}

export interface ModelCapabilities {
  readonly providerId: string;
  readonly providerMode: "watsonx" | "fixture" | "disabled";
  readonly modelId: string | null;
  readonly modelAvailable: boolean;
  readonly checkedAt: string;
  readonly promptVersions: {
    readonly step: string;
    readonly finalize: string;
  };
}

export interface NarrativeModelProvider {
  readonly providerId: string;
  analyzeStep(
    input: StepAnalysisInput,
    signal: AbortSignal,
  ): Promise<ProviderResult<StepAnalysisOutput>>;
  finalizeRun(
    input: FinalizeRunInput,
    signal: AbortSignal,
  ): Promise<ProviderResult<FinalizeRunOutput>>;
  capabilities(signal: AbortSignal): Promise<ModelCapabilities>;
}
