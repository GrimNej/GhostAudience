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
import { parseJsonContent } from "../../validation/parse-json-content";
import { validateStepOutput } from "../../validation/validate-step-output";
import type {
  ModelCapabilities,
  NarrativeModelProvider,
  ProviderResult,
  ProviderUsage,
} from "../model-provider";
import { assertModelAvailable } from "./model-catalog";
import { watsonxChat } from "./watsonx-client";

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

export class WatsonxProvider implements NarrativeModelProvider {
  public readonly providerId = "watsonx";
  public constructor(private readonly config: LiveRuntimeConfig) {}

  public async analyzeStep(
    input: StepAnalysisInput,
    signal: AbortSignal,
  ): Promise<ProviderResult<StepAnalysisOutput>> {
    const first = await watsonxChat(
      this.config,
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
      return {
        output: validateStepOutput(input, parseJsonContent(first.content)),
        usage: usageOf(first),
      };
    } catch (firstError: unknown) {
      const repaired = await watsonxChat(
        this.config,
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
      );
      try {
        const output = validateStepOutput(input, parseJsonContent(repaired.content));
        const totalTokens = (first.totalTokens ?? 0) + (repaired.totalTokens ?? 0);
        return {
          output,
          usage: {
            promptTokens: (first.promptTokens ?? 0) + (repaired.promptTokens ?? 0),
            completionTokens:
              (first.completionTokens ?? 0) + (repaired.completionTokens ?? 0),
            totalTokens: totalTokens === 0 ? null : totalTokens,
          },
        };
      } catch {
        throw new ApiError(
          "MODEL_OUTPUT_INVALID",
          502,
          "The watsonx.ai response failed validation after one bounded repair attempt.",
          false,
        );
      }
    }
  }

  public async finalizeRun(
    input: FinalizeRunInput,
    signal: AbortSignal,
  ): Promise<ProviderResult<FinalizeRunOutput>> {
    const result = await watsonxChat(
      this.config,
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
