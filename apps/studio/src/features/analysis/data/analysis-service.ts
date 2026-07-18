import type { StepAnalysisOutput } from "@ghost-audience/contracts";
import type { AudienceState, ScriptDocument } from "@ghost-audience/domain";
import { nanoid } from "nanoid";
import { ApiClient } from "../../../infrastructure/network/api-client";
import { CircuitBreaker } from "../../../infrastructure/network/circuit-breaker";
import { withRetry } from "../../../infrastructure/network/retry";
import { buildStepAnalysisInput } from "../domain/build-step-input";
import { inspectForFutureCanary } from "../domain/future-canary";

export interface AnalyzeSegmentInput {
  readonly runId: string;
  readonly script: ScriptDocument;
  readonly ordinal: number;
  readonly priorState: AudienceState;
  readonly prefixHashes: readonly string[];
  readonly promptVersion: string;
  readonly modelId: string;
  readonly futureCanary: string | null;
}

export class AnalysisService {
  public constructor(
    private readonly apiClient = new ApiClient(),
    private readonly circuitBreaker = new CircuitBreaker(),
  ) {}

  public async analyzeSegment(
    input: AnalyzeSegmentInput,
    signal: AbortSignal,
  ): Promise<{
    readonly request: Awaited<ReturnType<typeof buildStepAnalysisInput>>;
    readonly response: StepAnalysisOutput;
  }> {
    const segment = input.script.segments[input.ordinal];
    if (segment === undefined)
      throw new Error(`Segment ${input.ordinal} does not exist.`);
    const request = await buildStepAnalysisInput({
      requestId: `request_${nanoid(20)}`,
      runId: input.runId,
      script: input.script,
      currentSegment: segment,
      priorState: input.priorState,
      prefixHashes: input.prefixHashes,
      promptVersion: input.promptVersion,
      modelId: input.modelId,
    });
    if (
      input.futureCanary !== null &&
      inspectForFutureCanary(request, input.futureCanary).found
    ) {
      throw new Error("Future canary leaked into the neutral request.");
    }
    const response = await this.circuitBreaker.execute(() =>
      withRetry(
        (_attempt, retrySignal) => this.apiClient.analyzeStep(request, retrySignal),
        signal,
      ),
    );
    if (
      input.futureCanary !== null &&
      inspectForFutureCanary(response, input.futureCanary).found
    ) {
      throw new Error("Future canary appeared in the model response.");
    }
    return { request, response };
  }
}
