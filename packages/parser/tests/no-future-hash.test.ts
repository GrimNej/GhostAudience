import { describe, expect, it } from "vitest";
import {
  computePrefixHashChain,
  sha256,
} from "../src/index.js";

describe("prefix hash chain", () => {
  it("changes only at and after the modified segment", async () => {
    const original = await Promise.all([
      sha256("one"),
      sha256("two"),
      sha256("three"),
    ]);
    const changed = await Promise.all([
      sha256("one"),
      sha256("TWO"),
      sha256("three"),
    ]);

    const originalChain =
      await computePrefixHashChain(original);
    const changedChain =
      await computePrefixHashChain(changed);

    expect(originalChain[0]).toBe(changedChain[0]);
    expect(originalChain[1]).not.toBe(
      changedChain[1],
    );
    expect(originalChain[2]).not.toBe(
      changedChain[2],
    );
  });
});