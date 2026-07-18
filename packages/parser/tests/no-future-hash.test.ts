import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { computePrefixHashChain, sha256 } from "../src/index.js";

describe("prefix hash chain", () => {
  it("changes only at and after the modified segment", async () => {
    const original = await Promise.all([sha256("one"), sha256("two"), sha256("three")]);
    const changed = await Promise.all([sha256("one"), sha256("TWO"), sha256("three")]);

    const originalChain = await computePrefixHashChain(original);
    const changedChain = await computePrefixHashChain(changed);

    expect(originalChain[0]).toBe(changedChain[0]);
    expect(originalChain[1]).not.toBe(changedChain[1]);
    expect(originalChain[2]).not.toBe(changedChain[2]);
  });

  it("preserves every shared prefix for arbitrary scripts", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 80 }), {
          minLength: 2,
          maxLength: 8,
        }),
        async (segments) => {
          const original = await Promise.all(
            segments.map((segment) => sha256(segment)),
          );
          const finalSegment = segments[segments.length - 1];
          if (finalSegment === undefined) {
            throw new Error("Property fixture requires a final segment.");
          }
          const changed = await Promise.all(
            [...segments.slice(0, -1), `${finalSegment}\u0000`].map((segment) =>
              sha256(segment),
            ),
          );

          const originalChain = await computePrefixHashChain(original);
          const changedChain = await computePrefixHashChain(changed);
          expect(originalChain.slice(0, -1)).toEqual(changedChain.slice(0, -1));
          expect(originalChain.at(-1)).not.toBe(changedChain.at(-1));
        },
      ),
    );
  });
});
