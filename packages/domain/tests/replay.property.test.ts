import { describe, expect, it } from "vitest";
import {
  createEmptyAudienceState,
  replayQuestionEvents,
  runId,
} from "../src/index.js";
import { OPEN_EVENT, SEGMENT } from "./fixtures.js";

describe("event replay", () => {
  it("is deterministic", () => {
    const initial = createEmptyAudienceState(
      runId("run_00000001"),
    );

    const first = replayQuestionEvents(
      initial,
      [OPEN_EVENT],
      {
        currentOrdinal: 0,
        staleAfterSegments: 3,
        segments: [SEGMENT],
      },
    );

    const second = replayQuestionEvents(
      initial,
      [OPEN_EVENT],
      {
        currentOrdinal: 0,
        staleAfterSegments: 3,
        segments: [SEGMENT],
      },
    );

    expect({
      ...first,
      appliedOperationIds: [
        ...first.appliedOperationIds,
      ],
    }).toEqual({
      ...second,
      appliedOperationIds: [
        ...second.appliedOperationIds,
      ],
    });
  });
});