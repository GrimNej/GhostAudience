import type { SegmentKind, SourceFormat } from "@ghost-audience/domain";
import { parseFountainBlocks } from "./fountain.js";
import type { RawSection } from "./segment.js";

const MARKDOWN_HEADING = /^(#{1,6})\s+(.+)$/gmu;
const SCENE_HEADING = /^(?:INT\.|EXT\.|INT\/EXT\.|INT\.\/EXT\.|I\/E\.)\s+.+$/gmu;

export function detectSourceFormat(
  fileName: string | null,
  text: string,
): SourceFormat {
  const lowerName = fileName?.toLowerCase() ?? "";

  if (lowerName.endsWith(".fountain")) {
    return "fountain";
  }

  if (lowerName.endsWith(".md")) {
    return "markdown";
  }

  const sceneHeadingCount = [...text.matchAll(SCENE_HEADING)].length;

  return sceneHeadingCount >= 2 ? "fountain" : "plain";
}

export function extractSections(
  text: string,
  sourceFormat: SourceFormat,
): readonly RawSection[] {
  if (sourceFormat === "fountain") {
    return fountainSections(text);
  }

  const headingExpression =
    sourceFormat === "markdown"
      ? MARKDOWN_HEADING
      : /^(?:[A-Z][A-Z0-9 '’()./-]{2,80}|---)$/gmu;

  const headings = [...text.matchAll(headingExpression)];

  if (headings.length === 0) {
    return [
      {
        heading: null,
        text,
        startOffset: 0,
        endOffset: text.length,
        kind: "section",
      },
    ];
  }

  return headings.map((heading, index) => {
    const start = heading.index ?? 0;
    const next = headings[index + 1];
    const end = next?.index ?? text.length;
    const headingText = heading[0].trim();
    const bodyStart = start + heading[0].length;
    const body = exactTrimmedSlice(text, bodyStart, end);

    return {
      heading: headingText,
      text: body?.text ?? headingText,
      startOffset: body?.startOffset ?? start,
      endOffset: body?.endOffset ?? start + heading[0].length,
      kind: "section",
    };
  });
}

function fountainSections(text: string): readonly RawSection[] {
  const blocks = parseFountainBlocks(text);
  const sceneStarts = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.kind === "scene_heading");

  if (sceneStarts.length === 0) {
    return [
      {
        heading: null,
        text,
        startOffset: 0,
        endOffset: text.length,
        kind: "scene",
      },
    ];
  }

  return sceneStarts.map((scene, index) => {
    const next = sceneStarts[index + 1];
    const start = scene.block.startOffset;
    const end = next?.block.startOffset ?? text.length;
    const body = exactTrimmedSlice(text, start, end);

    return {
      heading: scene.block.text,
      text: body?.text ?? scene.block.text,
      startOffset: body?.startOffset ?? start,
      endOffset: body?.endOffset ?? start + scene.block.text.length,
      kind: "scene" satisfies SegmentKind,
    };
  });
}

interface ExactTrimmedSlice {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

function exactTrimmedSlice(
  source: string,
  startOffset: number,
  endOffset: number,
): ExactTrimmedSlice | null {
  const raw = source.slice(startOffset, endOffset);
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const relativeStart = raw.indexOf(trimmed);
  if (relativeStart < 0) {
    throw new Error("Unable to recover exact trimmed source offsets.");
  }

  const exactStartOffset = startOffset + relativeStart;
  return {
    text: trimmed,
    startOffset: exactStartOffset,
    endOffset: exactStartOffset + trimmed.length,
  };
}
