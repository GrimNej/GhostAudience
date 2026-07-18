import type { AudienceState } from "./audience-state.js";
import { StateInvariantError } from "./errors.js";
import { eventQuestionId, type QuestionEvent } from "./questions.js";
import type { ScriptSegment } from "./script.js";
import { applyQuestionEvent } from "./transition.js";

export interface ReplayOptions {
  readonly currentOrdinal: number;
  readonly staleAfterSegments: number;
  readonly segments: readonly ScriptSegment[];
}

export function replayQuestionEvents(
  initialState: AudienceState,
  events: readonly QuestionEvent[],
  options: ReplayOptions,
): AudienceState {
  const questionsById = new Map(
    initialState.questions.map((question) => [question.id, question]),
  );
  const appliedOperationIds = new Set(initialState.appliedOperationIds);
  const segmentsById = new Map(
    options.segments.map((segment) => [segment.id, segment]),
  );

  for (const event of events) {
    const targetId = eventQuestionId(event);
    const existing = questionsById.get(targetId);
    const updated = applyQuestionEvent(existing, event, {
      currentOrdinal: options.currentOrdinal,
      staleAfterSegments: options.staleAfterSegments,
      segmentsById,
      appliedOperationIds,
    });

    questionsById.set(updated.id, updated);
    appliedOperationIds.add(event.operationId);
  }

  const questions = [...questionsById.values()].sort(
    (left, right) =>
      left.openedAtOrdinal - right.openedAtOrdinal || left.id.localeCompare(right.id),
  );

  const nextState: AudienceState = {
    ...initialState,
    processedThroughOrdinal: options.currentOrdinal,
    questions,
    revision: initialState.revision + 1,
    appliedOperationIds,
  };

  assertAudienceState(nextState);

  return nextState;
}

export function assertAudienceState(state: AudienceState): void {
  const questionIds = new Set<string>();

  for (const question of state.questions) {
    if (questionIds.has(question.id)) {
      throw new StateInvariantError("Question IDs must be unique", {
        questionId: question.id,
      });
    }

    questionIds.add(question.id);

    if (question.status === "resolved" && question.resolvedAtOrdinal === null) {
      throw new StateInvariantError("Resolved question requires resolved ordinal", {
        questionId: question.id,
      });
    }

    if (question.status !== "resolved" && question.resolvedAtOrdinal !== null) {
      throw new StateInvariantError(
        "Non-resolved question cannot retain resolved ordinal",
        {
          questionId: question.id,
          status: question.status,
        },
      );
    }

    if (question.lastChangedAtOrdinal < question.openedAtOrdinal) {
      throw new StateInvariantError("Question changed before it opened", {
        questionId: question.id,
      });
    }
  }
}
