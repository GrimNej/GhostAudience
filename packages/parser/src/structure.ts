import type {
  SegmentKind,
  SourceFormat,
} from "@ghost-audience/domain";
import {
  parseFountainBlocks,
} from "./fountain.js";
import type { RawSection } from "./segment.js";

const MARKDOWN_HEADING = /^(#{1,6})\s+(.+)$/gmu;
const SCENE_HEADING =
  /^(?:INT\.|EXT\.|INT\/EXT\.|INT\.\/EXT\.|I\/E\.)\s+.+$/gmu;

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

  const sceneHeadingCount = [
    ...text.matchAll(SCENE_HEADING),
  ].length;

  return sceneHeadingCount >= 2
    ? "fountain"
    : "plain";
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

  const headings = [
    ...text.matchAll(headingExpression),
  ];

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
    const body = text.slice(bodyStart, end).trim();

    return {
      heading: headingText,
      text: body.length > 0 ? body : headingText,
      startOffset:
        body.length > 0
          ? text.indexOf(body, bodyStart)
          : start,
      endOffset: end,
      kind: "section",
    };
  });
}

function fountainSections(
  text: string,
): readonly RawSection[] {
  const blocks = parseFountainBlocks(text);
  const sceneStarts = blocks
    .map((block, index) => ({ block, index }))
    .filter(
      ({ block }) =>
        block.kind === "scene_heading",
    );

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
    const end =
      next?.block.startOffset ?? text.length;
    const body = text.slice(start, end).trim();

    return {
      heading: scene.block.text,
      text: body,
      startOffset: start,
      endOffset: end,
      kind: "scene" satisfies SegmentKind,
    };
  });
}