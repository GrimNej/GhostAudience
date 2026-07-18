import {
  type ScriptId,
  type ScriptSegment,
  type SegmentKind,
  scriptId,
  segmentId,
} from "@ghost-audience/domain";
import { sha256 } from "./hash.js";
import { countWords } from "./normalize.js";

export interface RawSection {
  readonly heading: string | null;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly kind: SegmentKind;
}

export interface SegmentationOptions {
  readonly targetWords: number;
  readonly softMaximumWords: number;
  readonly hardMaximumWords: number;
  readonly maximumUtf8Bytes: number;
}

export const DEFAULT_SEGMENTATION_OPTIONS: SegmentationOptions = {
  targetWords: 550,
  softMaximumWords: 900,
  hardMaximumWords: 1_200,
  maximumUtf8Bytes: 9_000,
};

const progressivePlainTextThreshold = 360;

interface SegmentDraft extends RawSection {
  readonly sha256: string;
}

export interface VersionedSegments {
  readonly scriptVersionId: ScriptId;
  readonly segmentManifestHash: string;
  readonly segments: readonly ScriptSegment[];
}

export async function buildSegments(
  sourceHash: string,
  sections: readonly RawSection[],
  options: SegmentationOptions = DEFAULT_SEGMENTATION_OPTIONS,
): Promise<VersionedSegments> {
  const rawChunks = sections.flatMap((section) => splitSection(section, options));
  const drafts: SegmentDraft[] = [];
  for (const chunk of rawChunks)
    drafts.push({ ...chunk, sha256: await sha256(chunk.text) });

  const manifest = drafts.map((draft, ordinal) => ({
    ordinal,
    heading: draft.heading,
    kind: draft.kind,
    startOffset: draft.startOffset,
    endOffset: draft.endOffset,
    textHash: draft.sha256,
  }));
  const segmentManifestHash = await sha256(
    canonicalJson({ schemaVersion: "1.0", sourceHash, manifest }),
  );
  const versionHash = await sha256(
    `ghost-audience:script-version:v1:${sourceHash}:${segmentManifestHash}`,
  );
  const scriptVersionId = scriptId(`script_${versionHash.slice(0, 32)}`);

  const segments: ScriptSegment[] = [];
  for (const [ordinal, draft] of drafts.entries()) {
    const identity = await sha256(
      [scriptVersionId, ordinal, draft.startOffset, draft.endOffset, draft.sha256].join(
        ":",
      ),
    );
    segments.push({
      id: segmentId(`segment_${identity.slice(0, 32)}`),
      ordinal,
      kind: draft.kind,
      heading: draft.heading,
      text: draft.text,
      globalStartOffset: draft.startOffset,
      globalEndOffset: draft.endOffset,
      sha256: draft.sha256,
    });
  }

  return { scriptVersionId, segmentManifestHash, segments };
}

function splitSection(
  section: RawSection,
  options: SegmentationOptions,
): readonly RawSection[] {
  const sectionWords = countWords(section.text);
  const needsProgressivePlainTextRead =
    section.heading === null && sectionWords > progressivePlainTextThreshold;
  if (
    !needsProgressivePlainTextRead &&
    fits(section.text, options.softMaximumWords, options.maximumUtf8Bytes)
  )
    return [section];

  const targetWords =
    needsProgressivePlainTextRead && sectionWords <= options.softMaximumWords
      ? Math.ceil(sectionWords / 2)
      : options.targetWords;

  const paragraphs = paragraphRanges(section.text);
  if (paragraphs.length === 0) return [];
  const chunks: RawSection[] = [];
  let startIndex = 0;
  let endIndex = 0;

  while (startIndex < paragraphs.length) {
    endIndex = startIndex;
    let bestEnd = startIndex;
    while (endIndex < paragraphs.length) {
      const candidate = createChunk(
        section,
        itemAt(paragraphs, startIndex).start,
        itemAt(paragraphs, endIndex).end,
      );
      if (!fits(candidate.text, options.softMaximumWords, options.maximumUtf8Bytes))
        break;
      bestEnd = endIndex;
      if (countWords(candidate.text) >= targetWords) break;
      endIndex += 1;
    }

    if (
      bestEnd === startIndex &&
      !fits(
        itemAt(paragraphs, startIndex).text,
        options.hardMaximumWords,
        options.maximumUtf8Bytes,
      )
    ) {
      chunks.push(
        ...splitOversizedRange(
          section,
          itemAt(paragraphs, startIndex).start,
          itemAt(paragraphs, startIndex).end,
          options,
        ),
      );
      startIndex += 1;
      continue;
    }

    chunks.push(
      createChunk(
        section,
        itemAt(paragraphs, startIndex).start,
        itemAt(paragraphs, bestEnd).end,
      ),
    );
    startIndex = bestEnd + 1;
  }

  return chunks;
}

function fits(text: string, maximumWords: number, maximumBytes: number): boolean {
  return (
    countWords(text) <= maximumWords &&
    new TextEncoder().encode(text).byteLength <= maximumBytes
  );
}

interface ParagraphRange {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

function itemAt<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Missing item at index ${index}.`);
  }
  return item;
}

function paragraphRanges(text: string): readonly ParagraphRange[] {
  const ranges: ParagraphRange[] = [];
  const expression = /(?:[^\n]|\n(?!\n))+/gu;
  for (const match of text.matchAll(expression)) {
    const start = match.index;
    if (start === undefined) continue;
    ranges.push({ text: match[0], start, end: start + match[0].length });
  }
  return ranges;
}

function createChunk(section: RawSection, start: number, end: number): RawSection {
  let contentStart = start;
  let contentEnd = end;
  while (contentStart < contentEnd && /\s/u.test(section.text[contentStart] ?? ""))
    contentStart += 1;
  while (contentEnd > contentStart && /\s/u.test(section.text[contentEnd - 1] ?? ""))
    contentEnd -= 1;
  return {
    heading: section.heading,
    text: section.text.slice(contentStart, contentEnd),
    startOffset: section.startOffset + contentStart,
    endOffset: section.startOffset + contentEnd,
    kind: section.kind,
  };
}

function splitOversizedRange(
  section: RawSection,
  start: number,
  end: number,
  options: SegmentationOptions,
): readonly RawSection[] {
  const text = section.text.slice(start, end);
  const segmenter = new Intl.Segmenter("en", { granularity: "word" });
  const tokens = [...segmenter.segment(text)].filter((token) => token.isWordLike);
  if (tokens.length === 0) return [createChunk(section, start, end)];

  const chunks: RawSection[] = [];
  let tokenStart = 0;
  while (tokenStart < tokens.length) {
    let tokenEnd = Math.min(tokens.length, tokenStart + options.hardMaximumWords);
    let candidate = createChunk(
      section,
      start + itemAt(tokens, tokenStart).index,
      start +
        itemAt(tokens, tokenEnd - 1).index +
        itemAt(tokens, tokenEnd - 1).segment.length,
    );
    while (
      new TextEncoder().encode(candidate.text).byteLength > options.maximumUtf8Bytes &&
      tokenEnd > tokenStart + 1
    ) {
      tokenEnd -= 1;
      candidate = createChunk(
        section,
        start + itemAt(tokens, tokenStart).index,
        start +
          itemAt(tokens, tokenEnd - 1).index +
          itemAt(tokens, tokenEnd - 1).segment.length,
      );
    }
    if (
      new TextEncoder().encode(candidate.text).byteLength > options.maximumUtf8Bytes
    ) {
      throw new Error("A single word exceeds the provider-safe UTF-8 byte limit.");
    }
    chunks.push(candidate);
    tokenStart = tokenEnd;
  }
  return chunks;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
