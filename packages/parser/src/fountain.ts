export interface FountainBlock {
  readonly kind:
    | "scene_heading"
    | "action"
    | "character"
    | "dialogue"
    | "parenthetical"
    | "transition"
    | "section"
    | "page_break";
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

const SCENE_HEADING = /^(?:\.)?(?:INT\.|EXT\.|INT\/EXT\.|INT\.\/EXT\.|I\/E\.)\s+/u;
const TRANSITION = /(?:TO:|FADE OUT\.|CUT TO BLACK\.)$/u;
const SECTION = /^#{1,6}\s+/u;
const PAGE_BREAK = /^={3,}$/u;
const CHARACTER = /^[A-Z][A-Z0-9 ._'’()-]{1,50}$/u;
const PARENTHETICAL = /^\(.+\)$/u;

export function parseFountainBlocks(text: string): readonly FountainBlock[] {
  const blocks: FountainBlock[] = [];
  const paragraphs = splitParagraphsWithOffsets(text);
  let previousKind: FountainBlock["kind"] | null = null;

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.text.trim();

    if (trimmed.length === 0) {
      continue;
    }

    let kind: FountainBlock["kind"];

    if (SCENE_HEADING.test(trimmed)) {
      kind = "scene_heading";
    } else if (SECTION.test(trimmed)) {
      kind = "section";
    } else if (PAGE_BREAK.test(trimmed)) {
      kind = "page_break";
    } else if (trimmed.startsWith(">") || TRANSITION.test(trimmed)) {
      kind = "transition";
    } else if (CHARACTER.test(trimmed) && trimmed === trimmed.toUpperCase()) {
      kind = "character";
    } else if (PARENTHETICAL.test(trimmed) && previousKind === "character") {
      kind = "parenthetical";
    } else if (
      previousKind === "character" ||
      previousKind === "parenthetical" ||
      previousKind === "dialogue"
    ) {
      kind = "dialogue";
    } else {
      kind = "action";
    }

    blocks.push({
      kind,
      text: trimmed,
      startOffset: paragraph.startOffset,
      endOffset: paragraph.endOffset,
    });
    previousKind = kind;
  }

  return blocks;
}

interface ParagraphWithOffsets {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

function splitParagraphsWithOffsets(text: string): readonly ParagraphWithOffsets[] {
  const paragraphs: ParagraphWithOffsets[] = [];
  const separator = /\n{2,}/gu;
  let cursor = 0;

  for (const match of text.matchAll(separator)) {
    const matchIndex = match.index;

    if (matchIndex === undefined) {
      continue;
    }

    paragraphs.push({
      text: text.slice(cursor, matchIndex),
      startOffset: cursor,
      endOffset: matchIndex,
    });

    cursor = matchIndex + match[0].length;
  }

  paragraphs.push({
    text: text.slice(cursor),
    startOffset: cursor,
    endOffset: text.length,
  });

  return paragraphs;
}
