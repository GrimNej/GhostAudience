import { EvidenceValidationError } from "./errors.js";
import type { SegmentId } from "./ids.js";
import type { ScriptSegment } from "./script.js";

export interface EvidenceSpan {
  readonly segmentId: SegmentId;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly quote: string;
}

export function normalizeEvidenceText(value: string): string {
  return value
    .normalize("NFC")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/\s+/gu, " ")
    .trim();
}

export function validateEvidenceSpan(
  span: EvidenceSpan,
  segment: ScriptSegment,
): void {
  if (span.segmentId !== segment.id) {
    throw new EvidenceValidationError("Segment ID mismatch", {
      evidenceSegmentId: span.segmentId,
      actualSegmentId: segment.id,
    });
  }

  if (!Number.isSafeInteger(span.startOffset)) {
    throw new EvidenceValidationError("Start offset is not a safe integer", {
      startOffset: span.startOffset,
    });
  }

  if (!Number.isSafeInteger(span.endOffset)) {
    throw new EvidenceValidationError("End offset is not a safe integer", {
      endOffset: span.endOffset,
    });
  }

  if (span.startOffset < 0 || span.endOffset <= span.startOffset) {
    throw new EvidenceValidationError("Offset ordering is invalid", {
      startOffset: span.startOffset,
      endOffset: span.endOffset,
    });
  }

  if (span.endOffset > segment.text.length) {
    throw new EvidenceValidationError("End offset exceeds segment length", {
      endOffset: span.endOffset,
      segmentLength: segment.text.length,
    });
  }

  const actualQuote = segment.text.slice(
    span.startOffset,
    span.endOffset,
  );

  if (
    normalizeEvidenceText(actualQuote) !==
    normalizeEvidenceText(span.quote)
  ) {
    throw new EvidenceValidationError("Quote does not match offsets", {
      expectedQuote: span.quote,
      actualQuote,
      startOffset: span.startOffset,
      endOffset: span.endOffset,
    });
  }
}

export function locateUniqueEvidenceQuote(
  segment: ScriptSegment,
  quote: string,
): EvidenceSpan {
  const firstIndex = segment.text.indexOf(quote);

  if (firstIndex < 0) {
    throw new EvidenceValidationError("Quote is absent from segment", {
      segmentId: segment.id,
      quote,
    });
  }

  const secondIndex = segment.text.indexOf(
    quote,
    firstIndex + Math.max(1, quote.length),
  );

  if (secondIndex >= 0) {
    throw new EvidenceValidationError(
      "Quote occurs more than once; exact position is ambiguous",
      {
        segmentId: segment.id,
        quote,
        firstIndex,
        secondIndex,
      },
    );
  }

  return {
    segmentId: segment.id,
    startOffset: firstIndex,
    endOffset: firstIndex + quote.length,
    quote,
  };
}

export function mergeEvidence(
  existing: readonly EvidenceSpan[],
  additions: readonly EvidenceSpan[],
): readonly EvidenceSpan[] {
  const byKey = new Map<string, EvidenceSpan>();

  for (const span of [...existing, ...additions]) {
    const key = [
      span.segmentId,
      span.startOffset,
      span.endOffset,
      span.quote,
    ].join(":");

    byKey.set(key, span);
  }

  return [...byKey.values()].sort((left, right) => {
    if (left.segmentId !== right.segmentId) {
      return left.segmentId.localeCompare(right.segmentId);
    }

    return left.startOffset - right.startOffset;
  });
}