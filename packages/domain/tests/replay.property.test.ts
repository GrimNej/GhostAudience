import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createEmptyAudienceState, replayQuestionEvents, runId } from "../src/index.js";
import { OPEN_EVENT, SEGMENT } from "./fixtures.js";

describe("event replay", () => {
  it("is deterministic", () => {
    const initial = createEmptyAudienceState(runId("run_00000001"));

    const first = replayQuestionEvents(initial, [OPEN_EVENT], {
      currentOrdinal: 0,
      staleAfterSegments: 3,
      segments: [SEGMENT],
    });

    const second = replayQuestionEvents(initial, [OPEN_EVENT], {
      currentOrdinal: 0,
      staleAfterSegments: 3,
      segments: [SEGMENT],
    });

    expect({
      ...first,
      appliedOperationIds: [...first.appliedOperationIds],
    }).toEqual({
      ...second,
      appliedOperationIds: [...second.appliedOperationIds],
    });
  });

  it("is deterministic for arbitrary replay counts", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (eventCount) => {
        const initial = createEmptyAudienceState(runId("run_property_test"));
        const first = replayQuestionEvents(initial, [OPEN_EVENT], {
          currentOrdinal: 0,
          staleAfterSegments: 3,
          segments: [SEGMENT],
        });
        for (let attempt = 0; attempt < eventCount; attempt += 1) {
          const replayed = replayQuestionEvents(initial, [OPEN_EVENT], {
            currentOrdinal: 0,
            staleAfterSegments: 3,
            segments: [SEGMENT],
          });

          expect({
            ...replayed,
            appliedOperationIds: [...replayed.appliedOperationIds],
          }).toEqual({
            ...first,
            appliedOperationIds: [...first.appliedOperationIds],
          });
        }
      }),
    );
  });
});
