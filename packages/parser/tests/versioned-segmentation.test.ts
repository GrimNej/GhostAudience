import { describe, expect, it } from "vitest";
import { sha256 } from "../src/hash.js";
import { buildSegments } from "../src/segment.js";
import { parseScript } from "../src/index.js";

const source = [
  "Alpha one two three four five.",
  "Beta one two three four five.",
].join("\n\n");

const sections = [
  {
    heading: "Scene",
    text: source,
    startOffset: 0,
    endOffset: source.length,
    kind: "scene" as const,
  },
];

describe("immutable script versions", () => {
  it("changes version identity when only segmentation changes", async () => {
    const sourceHash = await sha256(source);
    const oneChunk = await buildSegments(sourceHash, sections, {
      targetWords: 100,
      softMaximumWords: 100,
      hardMaximumWords: 120,
      maximumUtf8Bytes: 9_000,
    });
    const splitChunks = await buildSegments(sourceHash, sections, {
      targetWords: 5,
      softMaximumWords: 6,
      hardMaximumWords: 8,
      maximumUtf8Bytes: 9_000,
    });
    expect(oneChunk.scriptVersionId).not.toBe(
      splitChunks.scriptVersionId,
    );
    expect(oneChunk.segmentManifestHash).not.toBe(
      splitChunks.segmentManifestHash,
    );
  });

  it("creates unique IDs for duplicate segment text", async () => {
    const parsed = await parseScript({
      title: "Dup",
      fileName: "dup.md",
      text: "# One\nSame text.\n\n# Two\nSame text.",
      now: "2026-07-18T00:00:00.000Z",
    });
    expect(
      new Set(parsed.segments.map((segment) => segment.id))
        .size,
    ).toBe(parsed.segments.length);
  });

  it("round trips every evidence slice to normalized source", async () => {
    const parsed = await parseScript({
      title: "Offsets",
      fileName: "offsets.txt",
      text: "  Alpha.  \n\nBeta.",
      now: "2026-07-18T00:00:00.000Z",
    });
    for (const segment of parsed.segments) {
      expect(
        parsed.normalizedText.slice(
          segment.globalStartOffset,
          segment.globalEndOffset,
        ),
      ).toBe(segment.text);
    }
  });
});