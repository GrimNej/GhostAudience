import {
  type AudienceState,
  applyKnowledgeEvents,
  buildCompactNarrativeState,
  createEmptyAudienceState,
  replayQuestionEvents,
  runId,
  type ScriptDocument,
} from "@ghost-audience/domain";
import type { GhostAudienceDatabase } from "./database";
import type { ProjectRecord, RunRecord, ScriptRecord, SegmentRecord } from "./records";

export interface ProjectWorkspace {
  readonly project: ProjectRecord;
  readonly script: ScriptRecord | null;
  readonly segments: readonly SegmentRecord[];
  readonly latestRun: RunRecord | null;
}

export class WorkspaceReadRepository {
  public constructor(private readonly db: GhostAudienceDatabase) {}

  public async projectWorkspace(projectId: string): Promise<ProjectWorkspace | null> {
    const project = await this.db.projects.get(projectId);
    if (project === undefined) return null;
    if (project.activeScriptId === null)
      return { project, script: null, segments: [], latestRun: null };
    const [script, segments, runs] = await Promise.all([
      this.db.scripts.get(project.activeScriptId),
      this.db.segments
        .where("scriptId")
        .equals(project.activeScriptId)
        .sortBy("ordinal"),
      this.db.runs.where("projectId").equals(projectId).toArray(),
    ]);
    const latestRun =
      runs.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ??
      null;
    return { project, script: script ?? null, segments, latestRun };
  }

  public async scriptDocument(scriptId: string): Promise<ScriptDocument> {
    const script = await this.db.scripts.get(scriptId);
    if (script === undefined)
      throw new Error(`Script version ${scriptId} does not exist.`);
    const segments = await this.db.segments
      .where("scriptId")
      .equals(scriptId)
      .sortBy("ordinal");
    return {
      id: script.id as ScriptDocument["id"],
      title: script.title,
      sourceFormat: script.sourceFormat,
      normalizedText: script.normalizedText,
      sha256: script.sha256,
      segmentManifestHash: script.segmentManifestHash,
      wordCount: script.wordCount,
      segments,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt,
    };
  }

  public async questions(runIdValue: string) {
    return this.db.questions
      .where("runId")
      .equals(runIdValue)
      .sortBy("openedAtOrdinal");
  }

  public async audienceStateAt(
    run: RunRecord,
    ordinal: number,
  ): Promise<AudienceState> {
    const segments = await this.db.segments
      .where("scriptId")
      .equals(run.scriptId)
      .sortBy("ordinal");
    const questionEvents = await this.db.questionEvents
      .where("runId")
      .equals(run.id)
      .sortBy("ordinal");
    const knowledgeEvents = await this.db.knowledgeEvents
      .where("runId")
      .equals(run.id)
      .sortBy("ordinal");
    let state = createEmptyAudienceState(runId(run.id));

    for (let current = 0; current <= ordinal; current += 1) {
      const questionsForOrdinal = questionEvents
        .filter((record) => record.ordinal === current)
        .map((record) => record.event);
      const knowledgeForOrdinal = knowledgeEvents
        .filter((record) => record.ordinal === current)
        .map((record) => record.event);
      state = replayQuestionEvents(state, questionsForOrdinal, {
        currentOrdinal: current,
        staleAfterSegments: 3,
        segments,
      });
      const knowledge = applyKnowledgeEvents(
        state.facts,
        state.assumptions,
        knowledgeForOrdinal,
      );
      state = {
        ...state,
        processedThroughOrdinal: current,
        facts: knowledge.facts,
        assumptions: knowledge.assumptions,
        compactNarrativeState: buildCompactNarrativeState({
          facts: knowledge.facts,
          assumptions: knowledge.assumptions,
          questions: state.questions,
        }),
      };
    }
    return state;
  }

  public async proofData(run: RunRecord) {
    const [steps, questionEvents, knowledgeEvents, auditEvents] = await Promise.all([
      this.db.runSteps.where("runId").equals(run.id).toArray(),
      this.db.questionEvents.where("runId").equals(run.id).toArray(),
      this.db.knowledgeEvents.where("runId").equals(run.id).toArray(),
      this.db.auditEvents.where("runId").equals(run.id).toArray(),
    ]);
    return { steps, questionEvents, knowledgeEvents, auditEvents };
  }
}
