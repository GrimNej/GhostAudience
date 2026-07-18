import type { ScriptId, SegmentId } from "./ids.js";

export type SourceFormat = "plain" | "markdown" | "fountain" | "docling";
export type SegmentKind = "scene" | "beat" | "section";

export interface ScriptSegment {
  readonly id: SegmentId;
  readonly ordinal: number;
  readonly kind: SegmentKind;
  readonly heading: string | null;
  readonly text: string;
  readonly globalStartOffset: number;
  readonly globalEndOffset: number;
  readonly sha256: string;
}

export interface ScriptDocument {
  /** Immutable script-version identifier, not merely the source-text hash. */
  readonly id: ScriptId;
  readonly title: string;
  readonly sourceFormat: SourceFormat;
  readonly normalizedText: string;
  /** Hash of normalized source text only. */
  readonly sha256: string;
  /** Hash of the canonical segmentation manifest. */
  readonly segmentManifestHash: string;
  readonly wordCount: number;
  readonly segments: readonly ScriptSegment[];
  readonly createdAt: string;
  readonly updatedAt: string;
}