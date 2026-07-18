import {
  DuplicateOperationError,
  InvalidQuestionTransitionError,
  StateInvariantError,
  UnknownQuestionError,
} from "./errors.js";
import { mergeEvidence, validateEvidenceSpan } from "./evidence.js";
import type { AudienceQuestion, QuestionEvent, QuestionStatus } from "./questions.js";
import type { ScriptSegment } from "./script.js";

export interface TransitionContext {
  readonly currentOrdinal: number;
  readonly staleAfterSegments: number;
  readonly segmentsById: ReadonlyMap<string, ScriptSegment>;
  readonly appliedOperationIds: ReadonlySet<string>;
}

type ExistingEvent = Exclude<QuestionEvent, { readonly type: "QUESTION_OPENED" }>;

const ALLOWED_EXISTING_EVENTS: Readonly<
  Record<QuestionStatus, ReadonlySet<ExistingEvent["type"]>>
> = {
  open: new Set([
    "QUESTION_REINFORCED",
    "QUESTION_PARTIALLY_ANSWERED",
    "QUESTION_RESOLVED",
    "QUESTION_CONTRADICTED",
    "QUESTION_MARKED_STALE",
  ]),
  partially_answered: new Set([
    "QUESTION_REINFORCED",
    "QUESTION_PARTIALLY_ANSWERED",
    "QUESTION_RESOLVED",
    "QUESTION_CONTRADICTED",
    "QUESTION_MARKED_STALE",
  ]),
  resolved: new Set(["QUESTION_REOPENED"]),
  contradicted: new Set(["QUESTION_REOPENED"]),
  stale: new Set(["QUESTION_REOPENED"]),
};

function validateEventEvidence(event: QuestionEvent, context: TransitionContext): void {
  const evidence =
    event.type === "QUESTION_OPENED"
      ? event.question.evidence
      : event.type === "QUESTION_PARTIALLY_ANSWERED" ||
          event.type === "QUESTION_RESOLVED"
        ? event.answerEvidence
        : event.type === "QUESTION_MARKED_STALE"
          ? []
          : event.evidence;

  for (const span of evidence) {
    const segment = context.segmentsById.get(span.segmentId);

    if (segment === undefined) {
      throw new StateInvariantError("Evidence references unknown segment", {
        segmentId: span.segmentId,
      });
    }

    if (segment.ordinal > context.currentOrdinal) {
      throw new StateInvariantError("Evidence references a future segment", {
        evidenceOrdinal: segment.ordinal,
        currentOrdinal: context.currentOrdinal,
      });
    }

    validateEvidenceSpan(span, segment);
  }
}

function assertOperationIsNew(event: QuestionEvent, context: TransitionContext): void {
  if (context.appliedOperationIds.has(event.operationId)) {
    throw new DuplicateOperationError(event.operationId);
  }
}

function assertAllowedExistingTransition(
  question: AudienceQuestion,
  event: ExistingEvent,
): void {
  if (!ALLOWED_EXISTING_EVENTS[question.status].has(event.type)) {
    throw new InvalidQuestionTransitionError(
      event.type,
      question.status,
      "Transition is not in the legal transition table.",
    );
  }
}

function assertStaleThreshold(
  question: AudienceQuestion,
  context: TransitionContext,
): void {
  const age = context.currentOrdinal - question.lastChangedAtOrdinal;

  if (age < context.staleAfterSegments) {
    throw new InvalidQuestionTransitionError(
      "QUESTION_MARKED_STALE",
      question.status,
      `Question age ${age} is below stale threshold ${context.staleAfterSegments}.`,
    );
  }
}

export function applyQuestionEvent(
  question: AudienceQuestion | undefined,
  event: QuestionEvent,
  context: TransitionContext,
): AudienceQuestion {
  assertOperationIsNew(event, context);
  validateEventEvidence(event, context);

  if (event.type === "QUESTION_OPENED") {
    if (question !== undefined) {
      throw new InvalidQuestionTransitionError(
        event.type,
        question.status,
        "A question with this ID already exists.",
      );
    }

    if (event.question.openedAtOrdinal !== context.currentOrdinal) {
      throw new StateInvariantError(
        "Opened question ordinal must equal current ordinal",
        {
          openedAtOrdinal: event.question.openedAtOrdinal,
          currentOrdinal: context.currentOrdinal,
        },
      );
    }

    return {
      ...event.question,
      status: "open",
      creatorDisposition: "unreviewed",
      answerEvidence: [],
      relatedQuestionIds: [],
      resolvedAtOrdinal: null,
      revision: 1,
    };
  }

  if (question === undefined) {
    throw new UnknownQuestionError(event.questionId);
  }

  assertAllowedExistingTransition(question, event);

  switch (event.type) {
    case "QUESTION_REINFORCED":
      return {
        ...question,
        evidence: mergeEvidence(question.evidence, event.evidence),
        rationale: event.rationale,
        lastChangedAtOrdinal: context.currentOrdinal,
        revision: question.revision + 1,
      };

    case "QUESTION_PARTIALLY_ANSWERED":
      return {
        ...question,
        status: "partially_answered",
        answerEvidence: mergeEvidence(question.answerEvidence, event.answerEvidence),
        rationale: event.rationale,
        lastChangedAtOrdinal: context.currentOrdinal,
        revision: question.revision + 1,
      };

    case "QUESTION_RESOLVED":
      return {
        ...question,
        status: "resolved",
        answerEvidence: mergeEvidence(question.answerEvidence, event.answerEvidence),
        rationale: event.rationale,
        lastChangedAtOrdinal: context.currentOrdinal,
        resolvedAtOrdinal: context.currentOrdinal,
        revision: question.revision + 1,
      };

    case "QUESTION_CONTRADICTED":
      return {
        ...question,
        status: "contradicted",
        evidence: mergeEvidence(question.evidence, event.evidence),
        rationale: event.rationale,
        lastChangedAtOrdinal: context.currentOrdinal,
        resolvedAtOrdinal: null,
        revision: question.revision + 1,
      };

    case "QUESTION_MARKED_STALE":
      assertStaleThreshold(question, context);

      return {
        ...question,
        status: "stale",
        rationale: event.rationale,
        lastChangedAtOrdinal: context.currentOrdinal,
        resolvedAtOrdinal: null,
        revision: question.revision + 1,
      };

    case "QUESTION_REOPENED":
      return {
        ...question,
        status: "open",
        evidence: mergeEvidence(question.evidence, event.evidence),
        rationale: event.rationale,
        lastChangedAtOrdinal: context.currentOrdinal,
        resolvedAtOrdinal: null,
        revision: question.revision + 1,
      };
  }
}
