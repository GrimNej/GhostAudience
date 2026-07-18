import {
  type FinalizeRunInput,
  type FinalizeRunOutput,
  FinalizeRunOutputSchema,
  type StepAnalysisInput,
  type StepAnalysisOutput,
} from "@ghost-audience/contracts";
import type { LiveRuntimeConfig } from "../../env";
import { ApiError } from "../../errors";
import { finalizeSystemPrompt } from "../../prompts/finalize.system.v1";
import { buildFinalizeUserPrompt } from "../../prompts/finalize.user.v1";
import { promptManifest } from "../../prompts/manifest";
import { buildStepRetryUserPrompt } from "../../prompts/step.retry.user.v1";
import { stepSystemPrompt } from "../../prompts/step.system.v1";
import { buildStepUserPrompt } from "../../prompts/step.user.v1";
import { normalizeStepOutput } from "../../validation/normalize-step-output";
import { parseJsonContent } from "../../validation/parse-json-content";
import { buildSafeFallbackStepOutput } from "../../validation/safe-fallback-step-output";
import { validateStepOutput } from "../../validation/validate-step-output";
import { cloudflareAiChat } from "../cloudflare/cloudflare-ai-client";
import type {
  ModelCapabilities,
  NarrativeModelProvider,
  ProviderResult,
  ProviderUsage,
} from "../model-provider";
import { assertModelAvailable } from "./model-catalog";
import {
  type WatsonxChatRequest,
  type WatsonxChatResult,
  watsonxChat,
} from "./watsonx-client";

const continuityWarning =
  "IBM watsonx.ai was temporarily unavailable, so this section continued on the backup audience model.";
const primaryProviderWindowMilliseconds = 15_000;

type ResilientChatResult = WatsonxChatResult & {
  readonly usedBackupModel: boolean;
};

function canUseBackupModel(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    [
      "PROVIDER_UNAVAILABLE",
      "PROVIDER_QUOTA_EXHAUSTED",
      "PROVIDER_AUTH_FAILED",
      "MODEL_NOT_AVAILABLE",
    ].includes(error.code)
  );
}

function isProviderDeadlineError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function addContinuityWarning(
  output: StepAnalysisOutput,
  usedBackupModel: boolean,
): StepAnalysisOutput {
  if (!usedBackupModel || output.warnings.includes(continuityWarning)) return output;
  return {
    ...output,
    warnings: [...output.warnings, continuityWarning],
  };
}

function usageOf(result: {
  readonly promptTokens: number | null;
  readonly completionTokens: number | null;
  readonly totalTokens: number | null;
}): ProviderUsage {
  return {
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.totalTokens,
  };
}

function validationMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown validation failure.";
}

function combinedUsage(
  first: Parameters<typeof usageOf>[0],
  second: Parameters<typeof usageOf>[0],
): ProviderUsage {
  const totalTokens = (first.totalTokens ?? 0) + (second.totalTokens ?? 0);
  return {
    promptTokens: (first.promptTokens ?? 0) + (second.promptTokens ?? 0),
    completionTokens: (first.completionTokens ?? 0) + (second.completionTokens ?? 0),
    totalTokens: totalTokens === 0 ? null : totalTokens,
  };
}

function assertUsefulStepOutput(output: StepAnalysisOutput): void {
  const additions =
    output.factsAdded.length +
    output.assumptionsAdded.length +
    output.assumptionUpdates.length +
    output.questionOperations.length;

  if (additions === 0) {
    throw new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "The model returned an empty audience state for a non-empty segment.",
      false,
    );
  }
}

export class WatsonxProvider implements NarrativeModelProvider {
  public readonly providerId = "watsonx";
  public constructor(
    private readonly config: LiveRuntimeConfig,
    private readonly backupAi?: Ai,
  ) {}

  private async chat(
    input: WatsonxChatRequest,
    signal: AbortSignal,
    preferBackupModel = false,
  ): Promise<ResilientChatResult> {
    if (preferBackupModel && this.backupAi !== undefined) {
      return {
        ...(await cloudflareAiChat(this.backupAi, input, signal)),
        usedBackupModel: true,
      };
    }

    const primarySignal = AbortSignal.any([
      signal,
      AbortSignal.timeout(
        Math.min(input.timeLimitMilliseconds, primaryProviderWindowMilliseconds),
      ),
    ]);
    try {
      return {
        ...(await watsonxChat(this.config, input, primarySignal)),
        usedBackupModel: false,
      };
    } catch (error: unknown) {
      if (
        signal.aborted ||
        this.backupAi === undefined ||
        (!canUseBackupModel(error) && !isProviderDeadlineError(error))
      ) {
        throw error;
      }
      return {
        ...(await cloudflareAiChat(this.backupAi, input, signal)),
        usedBackupModel: true,
      };
    }
  }

  public async analyzeStep(
    input: StepAnalysisInput,
    signal: AbortSignal,
  ): Promise<ProviderResult<StepAnalysisOutput>> {
    const first = await this.chat(
      {
        messages: [
          { role: "system", content: stepSystemPrompt },
          { role: "user", content: buildStepUserPrompt(input) },
        ],
        maxTokens: 3_500,
        temperature: 0,
        timeLimitMilliseconds: 40_000,
      },
      signal,
    );

    try {
      const firstCandidate = parseJsonContent(first.content);
      const output = validateStepOutput(
        input,
        normalizeStepOutput(input, firstCandidate),
      );
      assertUsefulStepOutput(output);
      return {
        output: addContinuityWarning(output, first.usedBackupModel),
        usage: usageOf(first),
      };
    } catch (firstError: unknown) {
      const repaired = await this.chat(
        {
          messages: [
            { role: "system", content: stepSystemPrompt },
            {
              role: "user",
              content: buildStepRetryUserPrompt(input, validationMessage(firstError)),
            },
          ],
          maxTokens: 3_500,
          temperature: 0,
          timeLimitMilliseconds: 25_000,
        },
        signal,
        first.usedBackupModel,
      );
      let repairedCandidate: unknown = null;
      try {
        repairedCandidate = parseJsonContent(repaired.content);
        const output = validateStepOutput(
          input,
          normalizeStepOutput(input, repairedCandidate),
        );
        assertUsefulStepOutput(output);
        return {
          output: addContinuityWarning(
            output,
            first.usedBackupModel || repaired.usedBackupModel,
          ),
          usage: combinedUsage(first, repaired),
        };
      } catch {
        return {
          output: addContinuityWarning(
            buildSafeFallbackStepOutput(input, repairedCandidate),
            first.usedBackupModel || repaired.usedBackupModel,
          ),
          usage: combinedUsage(first, repaired),
        };
      }
    }
  }

  public async finalizeRun(
    input: FinalizeRunInput,
    signal: AbortSignal,
  ): Promise<ProviderResult<FinalizeRunOutput>> {
    const result = await this.chat(
      {
        messages: [
          { role: "system", content: finalizeSystemPrompt },
          { role: "user", content: buildFinalizeUserPrompt(input) },
        ],
        maxTokens: 2_000,
        temperature: 0,
        timeLimitMilliseconds: 30_000,
      },
      signal,
    );
    try {
      return {
        output: FinalizeRunOutputSchema.parse(parseJsonContent(result.content)),
        usage: usageOf(result),
      };
    } catch {
      throw new ApiError(
        "MODEL_OUTPUT_INVALID",
        502,
        "The watsonx.ai final summary failed validation.",
        false,
      );
    }
  }

  public async capabilities(signal: AbortSignal): Promise<ModelCapabilities> {
    await assertModelAvailable(this.config, signal);
    return {
      providerId: this.providerId,
      providerMode: "watsonx",
      modelId: this.config.watsonxModelId,
      modelAvailable: true,
      checkedAt: new Date().toISOString(),
      promptVersions: {
        step: promptManifest.step.version,
        finalize: promptManifest.finalize.version,
      },
    };
  }
}
