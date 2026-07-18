import { describe, expect, it } from "vitest";
import {
  EvidenceValidationError,
  locateUniqueEvidenceQuote,
  validateEvidenceSpan,
} from "../src/index.js";
import { SEGMENT } from "./fixtures.js";

describe("evidence validation", () => {
  it("accepts an exact quote and offset", () => {
    const span = locateUniqueEvidenceQuote(SEGMENT, "Not again.");

    expect(() => validateEvidenceSpan(span, SEGMENT)).not.toThrow();
  });

  it("rejects a mismatching quote", () => {
    expect(() =>
      validateEvidenceSpan(
        {
          segmentId: SEGMENT.id,
          startOffset: 0,
          endOffset: 4,
          quote: "Leo",
        },
        SEGMENT,
      ),
    ).toThrow(EvidenceValidationError);
  });

  it("rejects ambiguous repeated quotes", () => {
    const segment = {
      ...SEGMENT,
      text: "Wait. Wait.",
      globalEndOffset: 11,
    };

    expect(() => locateUniqueEvidenceQuote(segment, "Wait.")).toThrow(
      EvidenceValidationError,
    );
  });
});
