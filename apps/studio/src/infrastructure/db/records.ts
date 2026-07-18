import type { StepAnalysisOutput } from "@ghost-audience/contracts";
import type {
  AudienceAssumption,
  AudienceFact,
  AudienceQuestion,
  CreatorDisposition,
  IntentContract,
  KnowledgeEvent,
  QuestionEvent,
  ScriptDocument,
} from "@ghost-audience/domain";

export interface ProjectRecord {
  readonly id: string;
  readonly name: string;
  readonly activeScriptId: string | null;
  readonly intentContract: IntentContract;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ScriptRecord {
  readonly id: string;
  readonly projectId: string;
  readonly title: string;
  readonly sourceFormat: ScriptDocument["sourceFormat"];
  readonly normalizedText: string;
  readonly sha256: string;
  readonly segmentManifestHash: string;
  readonly wordCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type SegmentRecord = ScriptDocument["segments"][number] & {
  readonly scriptId: string;
};

export type PersistentRunStatus =
  | "draft"
  | "ready"
  | "running"
  | "waiting_retry"
  | "cancelled"
  | "failed"
  | "completed"
  | "completed_with_warnings";

export interface RunRecord {
  readonly id: string;
  readonly projectId: string;
  readonly scriptId: string;
  readonly scriptHash: string;
  readonly segmentManifestHash: string;
  readonly intentSnapshot: IntentContract;
  readonly providerMode: "watsonx" | "fixture";
  readonly modelId: string;
  readonly promptVersion: string;
  readonly status: PersistentRunStatus;
  readonly committedThroughOrdinal: number;
  readonly prefixHashes: readonly string[];
  readonly compactNarrativeState: string;
  readonly facts: readonly AudienceFact[];
  readonly assumptions: readonly AudienceAssumption[];
  readonly revision: number;
  readonly appliedOperationIds: readonly string[];
  readonly activeFence: number;
  readonly failureCode: string | null;
  readonly failureMessage: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt: string | null;
}

export interface RunStepRecord {
  readonly id: string;
  readonly runId: string;
  readonly ordinal: number;
  readonly requestId: string;
  readonly idempotencyKey: string;
  readonly providerMode: "watsonx" | "fixture";
  readonly modelId: string;
  readonly promptVersion: string;
  readonly rawValidatedResponse: StepAnalysisOutput;
  readonly committedAt: string;
}

export interface QuestionRecord extends AudienceQuestion {
  readonly id: AudienceQuestion["id"];
}

export interface QuestionEventRecord {
  readonly operationId: string;
  readonly runId: string;
  readonly questionId: string;
  readonly ordinal: number;
  readonly event: QuestionEvent;
  readonly createdAt: string;
}

export interface KnowledgeEventRecord {
  readonly operationId: string;
  readonly runId: string;
  readonly ordinal: number;
  readonly event: KnowledgeEvent;
  readonly createdAt: string;
}

export interface CreatorReviewRecord {
  readonly id: string;
  readonly runId: string;
  readonly questionId: string;
  readonly disposition: CreatorDisposition;
  readonly note: string | null;
  readonly updatedAt: string;
}

export interface AuditEventRecord {
  readonly sequence?: number;
  readonly runId: string | null;
  readonly type: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface SettingRecord {
  readonly key: string;
  readonly value: unknown;
}

export interface RunLeaseRecord {
  readonly runId: string;
  readonly ownerTabId: string;
  readonly fence: number;
  readonly expiresAtEpochMs: number;
  readonly heartbeatAtEpochMs: number;
}
