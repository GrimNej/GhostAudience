import {
  evaluateIntentLocally,
  type IntentContract,
  type ScriptDocument,
} from "@ghost-audience/domain";
import { computePrefixHashChain } from "@ghost-audience/parser";
import type { GhostAudienceDatabase } from "../../../infrastructure/db/database";
import { RunRepository } from "../../../infrastructure/db/run-repository";
import { WorkspaceReadRepository } from "../../../infrastructure/db/workspace-read-repository";
import { RunLockManager } from "../../../infrastructure/locks/run-lock";
import { mapModelOutput } from "../domain/map-model-output";
import { AnalysisService } from "./analysis-service";

export interface StartAnalysisInput {
  readonly projectId: string;
  readonly providerMode: "watsonx" | "fixture";
  readonly modelId: string;
  readonly promptVersion: string;
}

export class AnalysisController {
  private readonly activeProjects = new Set<string>();
  private readonly cancellation =
    new Map<string, AbortController>();
  private readonly runs: RunRepository;
  private readonly reads: WorkspaceReadRepository;
  private readonly locks: RunLockManager;
  private readonly service = new AnalysisService();

  public constructor(
    private readonly database: GhostAudienceDatabase,
    tabId = crypto.randomUUID(),
  ) {
    this.runs = new RunRepository(database);
    this.reads = new WorkspaceReadRepository(database);
    this.locks = new RunLockManager(database, tabId);
  }

  public async start(
    input: StartAnalysisInput,
  ): Promise<string> {
    if (this.activeProjects.has(input.projectId)) {
      throw new Error(
        "An analysis start is already in progress for this project.",
      );
    }
    this.activeProjects.add(input.projectId);
    try {
      const workspace =
        await this.reads.projectWorkspace(input.projectId);
      if (workspace === null || workspace.script === null) {
        throw new Error("A saved script is required.");
      }
      const script = await this.reads.scriptDocument(
        workspace.script.id,
      );
      const prefixHashes =
        await computePrefixHashChain(
          script.segments.map((segment) => segment.sha256),
        );
      const run = await this.runs.create({
        projectId: input.projectId,
        scriptId: script.id,
        scriptHash: script.sha256,
        segmentManifestHash: script.segmentManifestHash,
        intentSnapshot: workspace.project.intentContract,
        prefixHashes,
        providerMode: input.providerMode,
        modelId: input.modelId,
        promptVersion: input.promptVersion,
        now: new Date().toISOString(),
      });
      const userController = new AbortController();
      this.cancellation.set(run.id, userController);
      void this.executeRun(
        run.id,
        script,
        prefixHashes,
        workspace.project.intentContract,
        userController,
      ).finally(() => {
        this.cancellation.delete(run.id);
        this.activeProjects.delete(input.projectId);
      });
      return run.id;
    } catch (error: unknown) {
      this.activeProjects.delete(input.projectId);
      throw error;
    }
  }

  public cancel(runIdValue: string): void {
    this.cancellation
      .get(runIdValue)
      ?.abort(
        new DOMException(
          "Cancelled by user",
          "AbortError",
        ),
      );
  }

  private async executeRun(
    runIdValue: string,
    script: ScriptDocument,
    prefixHashes: readonly string[],
    intentSnapshot: IntentContract,
    userController: AbortController,
  ): Promise<void> {
    try {
      await this.locks.withExclusiveRunLock(
        runIdValue,
        async ({ signal: leaseSignal, fence }) => {
          const signal = AbortSignal.any([
            leaseSignal,
            userController.signal,
          ]);
          while (true) {
            signal.throwIfAborted();
            const state =
              await this.runs.loadState(runIdValue);
            const ordinal =
              state.processedThroughOrdinal + 1;
            if (ordinal >= script.segments.length) break;

            const run = await this.database.runs.get(
              runIdValue,
            );
            if (run === undefined) {
              throw new Error(
                `Run ${runIdValue} disappeared.`,
              );
            }

            const analyzed =
              await this.service.analyzeSegment(
                {
                  runId: runIdValue,
                  script,
                  ordinal,
                  priorState: state,
                  prefixHashes,
                  promptVersion: run.promptVersion,
                  modelId: run.modelId,
                  futureCanary: null,
                },
                signal,
              );
            const segment = script.segments[ordinal];
            if (segment === undefined) {
              throw new Error(
                `Segment ${ordinal} disappeared.`,
              );
            }
            const mapped = await mapModelOutput(
              analyzed.response,
              state,
              segment,
              analyzed.request.currentSegment.id,
            );
            const accepted = await this.runs.commitStep({
              runId: runIdValue,
              fence,
              ordinal,
              requestId: analyzed.request.requestId,
              idempotencyKey:
                analyzed.request.idempotencyKey,
              providerMode: run.providerMode,
              modelId: run.modelId,
              promptVersion: run.promptVersion,
              rawValidatedResponse: analyzed.response,
              questionEvents: mapped.questionEvents,
              knowledgeEvents: mapped.knowledgeEvents,
              segments: script.segments,
              now: new Date().toISOString(),
            });
            const alignment = evaluateIntentLocally(
              intentSnapshot,
              accepted,
              ordinal,
            );
            await this.database.auditEvents.add({
              runId: runIdValue,
              type: "INTENT_ALIGNMENT_EVALUATED",
              metadata: {
                ordinal,
                findings: alignment.map(
                  ({ targetId, status }) => ({
                    targetId,
                    status,
                  }),
                ),
              },
              createdAt: new Date().toISOString(),
            });
          }
        },
      );
      await this.runs.setStatus(
        runIdValue,
        "completed",
        new Date().toISOString(),
      );
    } catch (error: unknown) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        await this.runs.setStatus(
          runIdValue,
          "cancelled",
          new Date().toISOString(),
        );
        return;
      }
      await this.runs.setStatus(
        runIdValue,
        "failed",
        new Date().toISOString(),
        {
          code:
            error instanceof Error
              ? error.name
              : "UNKNOWN",
          message:
            error instanceof Error
              ? error.message
              : "Unknown analysis failure.",
        },
      );
    }
  }
}