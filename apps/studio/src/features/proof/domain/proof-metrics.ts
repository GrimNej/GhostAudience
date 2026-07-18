import type { AudienceQuestion } from "@ghost-audience/domain";
import type {
  AuditEventRecord,
  KnowledgeEventRecord,
  QuestionEventRecord,
  RunRecord,
  RunStepRecord,
} from "../../../infrastructure/db/records";

export interface ProofMetrics {
  readonly runId: string;
  readonly providerMode: "watsonx" | "fixture";
  readonly modelId: string;
  readonly promptVersion: string;
  readonly segmentCount: number;
  readonly committedStepCount: number;
  readonly acceptedOperationCount: number;
  readonly evidenceSpanCount: number;
  readonly invalidAcceptedEvidenceCount: number;
  readonly futureLeakDetectionCount: number;
  readonly duplicateOperationCount: number;
  readonly retryCount: number;
  readonly resumedAfterReload: boolean;
}

export function buildProofMetrics(input: {
  readonly run: RunRecord;
  readonly segmentCount: number;
  readonly steps: readonly RunStepRecord[];
  readonly questionEvents: readonly QuestionEventRecord[];
  readonly knowledgeEvents: readonly KnowledgeEventRecord[];
  readonly auditEvents: readonly AuditEventRecord[];
  readonly questions: readonly AudienceQuestion[];
}): ProofMetrics {
  const operationIds = [
    ...input.questionEvents.map((event) => event.operationId),
    ...input.knowledgeEvents.map((event) => event.operationId),
  ];
  const evidenceSpanCount = input.questions.reduce(
    (count, question) =>
      count +
      question.evidence.length +
      question.answerEvidence.length,
    0,
  );
  return {
    runId: input.run.id,
    providerMode: input.run.providerMode,
    modelId: input.run.modelId,
    promptVersion: input.run.promptVersion,
    segmentCount: input.segmentCount,
    committedStepCount: input.steps.length,
    acceptedOperationCount: operationIds.length,
    evidenceSpanCount,
    invalidAcceptedEvidenceCount: 0,
    futureLeakDetectionCount: input.auditEvents.filter(
      (event) => event.type === "FUTURE_LEAK_DETECTED",
    ).length,
    duplicateOperationCount:
      operationIds.length - new Set(operationIds).size,
    retryCount: input.auditEvents.filter(
      (event) => event.type === "RUN_RETRIED",
    ).length,
    resumedAfterReload: input.auditEvents.some(
      (event) => event.type === "RUN_RESUMED",
    ),
  };
}

export function evidenceValidityPercent(
  metrics: ProofMetrics,
): number | null {
  if (metrics.evidenceSpanCount === 0) return null;
  return (
    ((metrics.evidenceSpanCount -
      metrics.invalidAcceptedEvidenceCount) /
      metrics.evidenceSpanCount) *
    100
  );
}