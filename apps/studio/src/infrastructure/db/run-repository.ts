import type { StepAnalysisOutput } from "@ghost-audience/contracts";
import {
  type AudienceState,
  applyKnowledgeEvents,
  buildCompactNarrativeState,
  createEmptyAudienceState,
  type IntentContract,
  type KnowledgeEvent,
  type QuestionEvent,
  replayQuestionEvents,
  runId,
  type ScriptSegment,
} from "@ghost-audience/domain";
import { nanoid } from "nanoid";
import type { GhostAudienceDatabase } from "./database";
import type {
  KnowledgeEventRecord,
  PersistentRunStatus,
  QuestionEventRecord,
  RunRecord,
  RunStepRecord,
} from "./records";

export interface CreateRunInput {
  readonly projectId: string;
  readonly scriptId: string;
  readonly scriptHash: string;
  readonly segmentManifestHash: string;
  readonly intentSnapshot: IntentContract;
  readonly prefixHashes: readonly string[];
  readonly providerMode: "watsonx" | "fixture";
  readonly modelId: string;
  readonly promptVersion: string;
  readonly now: string;
}

export interface CommitStepInput {
  readonly runId: string;
  readonly fence: number;
  readonly ordinal: number;
  readonly requestId: string;
  readonly idempotencyKey: string;
  readonly providerMode: "watsonx" | "fixture";
  readonly modelId: string;
  readonly promptVersion: string;
  readonly rawValidatedResponse: StepAnalysisOutput;
  readonly questionEvents: readonly QuestionEvent[];
  readonly knowledgeEvents: readonly KnowledgeEvent[];
  readonly segments: readonly ScriptSegment[];
  readonly now: string;
}

export class RunRepository {
  public constructor(private readonly db: GhostAudienceDatabase) {}

  public async create(input: CreateRunInput): Promise<RunRecord> {
    const id = runId(`run_${nanoid(20)}`);
    const empty = createEmptyAudienceState(id);
    const record: RunRecord = {
      id,
      projectId: input.projectId,
      scriptId: input.scriptId,
      scriptHash: input.scriptHash,
      segmentManifestHash: input.segmentManifestHash,
      intentSnapshot: structuredClone(input.intentSnapshot),
      providerMode: input.providerMode,
      modelId: input.modelId,
      promptVersion: input.promptVersion,
      status: "ready",
      committedThroughOrdinal: -1,
      prefixHashes: input.prefixHashes,
      compactNarrativeState: empty.compactNarrativeState,
      facts: [],
      assumptions: [],
      revision: 0,
      appliedOperationIds: [],
      activeFence: 0,
      failureCode: null,
      failureMessage: null,
      createdAt: input.now,
      updatedAt: input.now,
      completedAt: null,
    };
    await this.db.runs.add(record);
    return record;
  }

  public async loadState(runIdValue: string): Promise<AudienceState> {
    const run = await this.requireRun(runIdValue);
    return this.loadStateWithinTransaction(run);
  }

  private async requireRun(runIdValue: string): Promise<RunRecord> {
    const run = await this.db.runs.get(runIdValue);
    if (run === undefined) throw new Error(`Run ${runIdValue} does not exist.`);
    return run;
  }

  private async loadStateWithinTransaction(run: RunRecord): Promise<AudienceState> {
    const questions = await this.db.questions
      .where("runId")
      .equals(run.id)
      .sortBy("openedAtOrdinal");
    return {
      runId: runId(run.id),
      processedThroughOrdinal: run.committedThroughOrdinal,
      facts: run.facts,
      assumptions: run.assumptions,
      questions,
      compactNarrativeState: run.compactNarrativeState,
      revision: run.revision,
      appliedOperationIds: new Set(run.appliedOperationIds),
    };
  }

  public async commitStep(input: CommitStepInput): Promise<AudienceState> {
    return this.db.transaction(
      "rw",
      [
        this.db.runs,
        this.db.runSteps,
        this.db.questions,
        this.db.questionEvents,
        this.db.knowledgeEvents,
        this.db.auditEvents,
      ],
      async () => {
        const run = await this.requireRun(input.runId);

        const existing = await this.db.runSteps
          .where("idempotencyKey")
          .equals(input.idempotencyKey)
          .first();
        if (existing !== undefined) {
          if (existing.runId !== input.runId || existing.ordinal !== input.ordinal) {
            throw new Error("Idempotency key collision across run steps.");
          }
          return this.loadStateWithinTransaction(run);
        }

        if (run.activeFence !== input.fence) {
          throw new Error(
            `Stale run owner. Expected fence ${run.activeFence}, received ${input.fence}.`,
          );
        }

        const expectedOrdinal = run.committedThroughOrdinal + 1;
        if (input.ordinal !== expectedOrdinal) {
          throw new Error(
            `Run cursor mismatch. Expected ${expectedOrdinal}, received ${input.ordinal}.`,
          );
        }

        const current = await this.loadStateWithinTransaction(run);
        const withQuestions = replayQuestionEvents(current, input.questionEvents, {
          currentOrdinal: input.ordinal,
          staleAfterSegments: 3,
          segments: input.segments,
        });
        const knowledge = applyKnowledgeEvents(
          withQuestions.facts,
          withQuestions.assumptions,
          input.knowledgeEvents,
        );
        const finalState: AudienceState = {
          ...withQuestions,
          processedThroughOrdinal: input.ordinal,
          facts: knowledge.facts,
          assumptions: knowledge.assumptions,
          compactNarrativeState: buildCompactNarrativeState({
            facts: knowledge.facts,
            assumptions: knowledge.assumptions,
            questions: withQuestions.questions,
          }),
        };

        const stepRecord: RunStepRecord = {
          id: `${input.runId}:${input.ordinal}`,
          runId: input.runId,
          ordinal: input.ordinal,
          requestId: input.requestId,
          idempotencyKey: input.idempotencyKey,
          providerMode: input.providerMode,
          modelId: input.modelId,
          promptVersion: input.promptVersion,
          rawValidatedResponse: input.rawValidatedResponse,
          committedAt: input.now,
        };
        const questionRecords: readonly QuestionEventRecord[] =
          input.questionEvents.map((event) => ({
            operationId: event.operationId,
            runId: input.runId,
            questionId:
              event.type === "QUESTION_OPENED" ? event.question.id : event.questionId,
            ordinal: input.ordinal,
            event,
            createdAt: input.now,
          }));
        const knowledgeRecords: readonly KnowledgeEventRecord[] =
          input.knowledgeEvents.map((event) => ({
            operationId: event.operationId,
            runId: input.runId,
            ordinal: input.ordinal,
            event,
            createdAt: input.now,
          }));

        await this.db.runSteps.add(stepRecord);
        await this.db.questions.bulkPut(finalState.questions);
        if (questionRecords.length > 0)
          await this.db.questionEvents.bulkAdd(questionRecords);
        if (knowledgeRecords.length > 0)
          await this.db.knowledgeEvents.bulkAdd(knowledgeRecords);
        await this.db.runs.update(input.runId, {
          status: "running",
          committedThroughOrdinal: input.ordinal,
          compactNarrativeState: finalState.compactNarrativeState,
          facts: finalState.facts,
          assumptions: finalState.assumptions,
          revision: finalState.revision,
          appliedOperationIds: [...finalState.appliedOperationIds],
          failureCode: null,
          failureMessage: null,
          updatedAt: input.now,
        });
        await this.db.auditEvents.add({
          runId: input.runId,
          type: "STEP_COMMITTED",
          metadata: {
            ordinal: input.ordinal,
            requestId: input.requestId,
            fence: input.fence,
          },
          createdAt: input.now,
        });
        return finalState;
      },
    );
  }

  public async setStatus(
    runIdValue: string,
    status: PersistentRunStatus,
    now: string,
    failure?: { readonly code: string; readonly message: string },
  ): Promise<void> {
    const changed = await this.db.runs.update(runIdValue, {
      status,
      failureCode: failure?.code ?? null,
      failureMessage: failure?.message ?? null,
      updatedAt: now,
      completedAt:
        status === "completed" || status === "completed_with_warnings" ? now : null,
    });
    if (changed !== 1) throw new Error(`Run ${runIdValue} does not exist.`);
  }
}
