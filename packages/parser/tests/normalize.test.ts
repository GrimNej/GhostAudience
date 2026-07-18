import { describe, expect, it } from "vitest";
import {
  countWords,
  normalizeScriptText,
} from "../src/index.js";

describe("normalizeScriptText", () => {
  it("normalizes line endings and trailing spaces", () => {
    expect(
      normalizeScriptText(
        "\uFEFFLine one  \r\n\r\n\r\n\r\nLine two\t\r\n",
      ),
    ).toBe("Line one\n\n\nLine two");
  });

  it("preserves case and punctuation", () => {
    expect(
      normalizeScriptText("MIRA: “Not again.”"),
    ).toBe("MIRA: “Not again.”");
  });
});

describe("countWords", () => {
  it("counts Unicode words and contractions", () => {
    expect(
      countWords("Mira can't forget काठमाडौं."),
    ).toBe(4);
  });
});