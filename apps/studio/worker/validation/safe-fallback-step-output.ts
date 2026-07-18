import type { StepAnalysisInput, StepAnalysisOutput } from "@ghost-audience/contracts";

const maximumQuoteLength = 460;
const minimumPreferredSentenceLength = 3;

function firstEvidenceRange(text: string): {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly quote: string;
} {
  const firstContent = text.search(/\S/u);
  const startOffset = Math.max(0, firstContent);
  const available = text.slice(startOffset, startOffset + maximumQuoteLength);
  const sentenceBoundary = /[.!?](?=\s|$)/gu;
  let preferredEnd: number | null = null;

  for (const match of available.matchAll(sentenceBoundary)) {
    const end = (match.index ?? 0) + match[0].length;
    if (end >= minimumPreferredSentenceLength) {
      preferredEnd = end;
      break;
    }
  }

  const rawEnd = preferredEnd ?? available.length;
  let quote = available.slice(0, rawEnd).trimEnd();
  if (quote.length === 0) quote = text.slice(startOffset, startOffset + 1);

  return {
    startOffset,
    endOffset: startOffset + quote.length,
    quote,
  };
}

function factStatement(quote: string): string {
  const normalized = quote.replace(/\s+/gu, " ").trim();
  if (normalized.length >= 3) return normalized.slice(0, 500);
  return `This section explicitly contains: ${JSON.stringify(normalized)}.`;
}

/**
 * Produces a minimal contract-valid result from exact source text. It is used only
 * after both model responses fail validation, so format drift cannot strand a run.
 */
export function buildSafeFallbackStepOutput(
  input: StepAnalysisInput,
): StepAnalysisOutput {
  const evidence = firstEvidenceRange(input.currentSegment.text);
  return {
    schemaVersion: "1.0",
    requestId: input.requestId,
    factsAdded: [
      {
        id: `fact_recovery_${input.currentOrdinal}_${input.currentSegment.id.slice(-24)}`,
        statement: factStatement(evidence.quote),
        confidence: "explicit",
        evidence: [
          {
            segmentId: input.currentSegment.id,
            ...evidence,
          },
        ],
      },
    ],
    assumptionsAdded: [],
    assumptionUpdates: [],
    questionOperations: [],
    warnings: [
      "Automatic evidence recovery was used because the model response format was invalid.",
    ],
  };
}
