import { describe, expect, it } from "vitest";
import {
  DuplicateOperationError,
  InvalidQuestionTransitionError,
  applyQuestionEvent,
  operationId,
} from "../src/index.js";
import {
  OPEN_EVENT,
  QUESTION_DRAFT,
  SEGMENT,
} from "./fixtures.js";

function context(
  currentOrdinal = 0,
  appliedOperationIds: ReadonlySet<string> =
    new Set(),
) {
  return {
    currentOrdinal,
    staleAfterSegments: 3,
    segmentsById: new Map([[SEGMENT.id, SEGMENT]]),
    appliedOperationIds,
  };
}

describe("applyQuestionEvent", () => {
  it("opens a question with canonical initial state", () => {
    const question = applyQuestionEvent(
      undefined,
      OPEN_EVENT,
      context(),
    );

    expect(question).toMatchObject({
      id: QUESTION_DRAFT.id,
      status: "open",
      creatorDisposition: "unreviewed",
      answerEvidence: [],
      relatedQuestionIds: [],
      resolvedAtOrdinal: null,
      revision: 1,
    });
  });

  it("rejects a duplicate operation", () => {
    expect(() =>
      applyQuestionEvent(
        undefined,
        OPEN_EVENT,
        context(
          0,
          new Set([OPEN_EVENT.operationId]),
        ),
      ),
    ).toThrow(DuplicateOperationError);
  });

  it("resolves an open question with valid evidence", () => {
    const opened = applyQuestionEvent(
      undefined,
      OPEN_EVENT,
      context(),
    );

    const resolved = applyQuestionEvent(
      opened,
      {
        operationId: operationId("operation_00000002"),
        type: "QUESTION_RESOLVED",
        questionId: opened.id,
        answerEvidence: opened.evidence,
        rationale:
          "The current segment explicitly supplies the answer.",
      },
      context(0, new Set([OPEN_EVENT.operationId])),
    );

    expect(resolved.status).toBe("resolved");
    expect(resolved.resolvedAtOrdinal).toBe(0);
    expect(resolved.revision).toBe(2);
  });

  it("rejects reinforcing a resolved question", () => {
    const opened = applyQuestionEvent(
      undefined,
      OPEN_EVENT,
      context(),
    );

    const resolved = applyQuestionEvent(
      opened,
      {
        operationId: operationId("operation_00000002"),
        type: "QUESTION_RESOLVED",
        questionId: opened.id,
        answerEvidence: opened.evidence,
        rationale:
          "The answer is explicitly supplied.",
      },
      context(0, new Set([OPEN_EVENT.operationId])),
    );

    expect(() =>
      applyQuestionEvent(
        resolved,
        {
          operationId: operationId(
            "operation_00000003",
          ),
          type: "QUESTION_REINFORCED",
          questionId: resolved.id,
          evidence: resolved.evidence,
          rationale:
            "This event is intentionally illegal.",
        },
        context(
          0,
          new Set([
            OPEN_EVENT.operationId,
            "operation_00000002",
          ]),
        ),
      ),
    ).toThrow(InvalidQuestionTransitionError);
  });

  it("rejects staleness before the age threshold", () => {
    const opened = applyQuestionEvent(
      undefined,
      OPEN_EVENT,
      context(),
    );

    expect(() =>
      applyQuestionEvent(
        opened,
        {
          operationId: operationId(
            "operation_00000004",
          ),
          type: "QUESTION_MARKED_STALE",
          questionId: opened.id,
          rationale:
            "The question has not been reinforced.",
        },
        context(2, new Set([OPEN_EVENT.operationId])),
      ),
    ).toThrow(InvalidQuestionTransitionError);
  });
});