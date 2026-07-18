import type { ScriptDocument } from "@ghost-audience/domain";
import { buildSegments } from "./segment.js";
import { sha256 } from "./hash.js";
import { countWords, normalizeScriptText } from "./normalize.js";
import { detectSourceFormat, extractSections } from "./structure.js";

export interface ParseScriptInput {
  readonly title: string;
  readonly fileName: string | null;
  readonly text: string;
  readonly now: string;
}

export async function parseScript(input: ParseScriptInput): Promise<ScriptDocument> {
  const normalizedText = normalizeScriptText(input.text);
  if (normalizedText.length === 0) throw new Error("Script text is empty.");

  const sourceHash = await sha256(normalizedText);
  const sourceFormat = detectSourceFormat(input.fileName, normalizedText);
  const sections = extractSections(normalizedText, sourceFormat);
  const versioned = await buildSegments(sourceHash, sections);

  for (const segment of versioned.segments) {
    const sourceSlice = normalizedText.slice(segment.globalStartOffset, segment.globalEndOffset);
    if (sourceSlice !== segment.text) {
      throw new Error(`Segment ${segment.ordinal} failed source-offset round-trip validation.`);
    }
  }

  return {
    id: versioned.scriptVersionId,
    title: input.title.trim() || "Untitled script",
    sourceFormat,
    normalizedText,
    sha256: sourceHash,
    segmentManifestHash: versioned.segmentManifestHash,
    wordCount: countWords(normalizedText),
    segments: versioned.segments,
    createdAt: input.now,
    updatedAt: input.now,
  };
}