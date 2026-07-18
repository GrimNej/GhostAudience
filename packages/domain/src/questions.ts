import type { EvidenceSpan } from "./evidence.js";
import type {
  OperationId,
  QuestionId,
  RunId,
} from "./ids.js";

export type QuestionKind =
  | "identity"
  | "motivation"
  | "causality"
  | "timeline"
  | "reference"
  | "world_rule"
  | "knowledge_gap"
  | "emotional_reaction"
  | "promise_payoff"
  | "possible_contradiction"
  | "stakes"
  | "spatial_relation"
  | "other";

export type QuestionStatus =
  | "open"
  | "partially_answered"
  | "resolved"
  | "contradicted"
  | "stale";

export type QuestionSeverity =
  | "curiosity"
  | "clarity_risk"
  | "blocking_confusion";

export type CreatorDisposition =
  | "unreviewed"
  | "intended"
  | "acceptable"
  | "accidental"
  | "incorrect_ai_interpretation";

export interface AudienceQuestion {
  readonly id: QuestionId;
  readonly runId: RunId;
  readonly semanticKey: string;
  readonly text: string;
  readonly kind: QuestionKind;
  readonly status: QuestionStatus;
  readonly severity: QuestionSeverity;
  readonly creatorDisposition: CreatorDisposition;
  readonly openedAtOrdinal: number;
  readonly lastChangedAtOrdinal: number;
  readonly resolvedAtOrdinal: number | null;
  readonly evidence: readonly EvidenceSpan[];
  readonly answerEvidence: readonly EvidenceSpan[];
  readonly rationale: string;
  readonly minimalClarification: string | null;
  readonly relatedQuestionIds: readonly QuestionId[];
  readonly revision: number;
}

export type AudienceQuestionDraft = Omit<
  AudienceQuestion,
  | "status"
  | "creatorDisposition"
  | "answerEvidence"
  | "relatedQuestionIds"
  | "resolvedAtOrdinal"
  | "revision"
>;

interface EventBase {
  readonly operationId: OperationId;
}

export type QuestionEvent =
  | (EventBase & {
      readonly type: "QUESTION_OPENED";
      readonly question: AudienceQuestionDraft;
    })
  | (EventBase & {
      readonly type: "QUESTION_REINFORCED";
      readonly questionId: QuestionId;
      readonly evidence: readonly EvidenceSpan[];
      readonly rationale: string;
    })
  | (EventBase & {
      readonly type: "QUESTION_PARTIALLY_ANSWERED";
      readonly questionId: QuestionId;
      readonly answerEvidence: readonly EvidenceSpan[];
      readonly rationale: string;
    })
  | (EventBase & {
      readonly type: "QUESTION_RESOLVED";
      readonly questionId: QuestionId;
      readonly answerEvidence: readonly EvidenceSpan[];
      readonly rationale: string;
    })
  | (EventBase & {
      readonly type: "QUESTION_CONTRADICTED";
      readonly questionId: QuestionId;
      readonly evidence: readonly EvidenceSpan[];
      readonly rationale: string;
    })
  | (EventBase & {
      readonly type: "QUESTION_MARKED_STALE";
      readonly questionId: QuestionId;
      readonly rationale: string;
    })
  | (EventBase & {
      readonly type: "QUESTION_REOPENED";
      readonly questionId: QuestionId;
      readonly evidence: readonly EvidenceSpan[];
      readonly rationale: string;
    });

export function eventQuestionId(
  event: QuestionEvent,
): QuestionId {
  return event.type === "QUESTION_OPENED"
    ? event.question.id
    : event.questionId;
}