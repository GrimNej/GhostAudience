import Dexie, { type EntityTable } from "dexie";
import type {
  AuditEventRecord,
  CreatorReviewRecord,
  KnowledgeEventRecord,
  ProjectRecord,
  QuestionEventRecord,
  QuestionRecord,
  RunLeaseRecord,
  RunRecord,
  RunStepRecord,
  ScriptRecord,
  SegmentRecord,
  SettingRecord,
} from "./records";

export class GhostAudienceDatabase extends Dexie {
  public projects!: EntityTable<ProjectRecord, "id">;
  public scripts!: EntityTable<ScriptRecord, "id">;
  public segments!: EntityTable<SegmentRecord, "id">;
  public runs!: EntityTable<RunRecord, "id">;
  public runSteps!: EntityTable<RunStepRecord, "id">;
  public questions!: EntityTable<QuestionRecord, "id">;
  public questionEvents!: EntityTable<QuestionEventRecord, "operationId">;
  public knowledgeEvents!: EntityTable<KnowledgeEventRecord, "operationId">;
  public creatorReviews!: EntityTable<CreatorReviewRecord, "id">;
  public auditEvents!: EntityTable<AuditEventRecord, "sequence">;
  public settings!: EntityTable<SettingRecord, "key">;
  public runLeases!: EntityTable<RunLeaseRecord, "runId">;

  public constructor(name = "ghost-audience") {
    super(name);
    this.version(2).stores({
      projects: "&id, updatedAt",
      scripts: "&id, projectId, sha256, segmentManifestHash, updatedAt",
      segments: "&id, scriptId, [scriptId+ordinal]",
      runs: "&id, projectId, scriptId, status, updatedAt, activeFence",
      runSteps: "&id, &idempotencyKey, runId, [runId+ordinal], requestId",
      questions: "&id, runId, status, severity, semanticKey",
      questionEvents: "&operationId, runId, questionId, ordinal",
      knowledgeEvents: "&operationId, runId, ordinal",
      creatorReviews: "&id, runId, questionId, disposition",
      auditEvents: "++sequence, runId, type, createdAt",
      settings: "&key",
      runLeases: "&runId, ownerTabId, fence, expiresAtEpochMs",
    });
  }
}

export const database = new GhostAudienceDatabase();