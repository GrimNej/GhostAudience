import type { StepAnalysisInput, StepAnalysisOutput } from "@ghost-audience/contracts";

const maximumQuoteLength = 460;
const minimumPreferredSentenceLength = 3;
const maximumRecoveredQuestions = 3;

type EvidenceRange = {
  readonly startOffset: number;
  readonly endOffset: number;
  readonly quote: string;
};

interface RecoveredQuestion {
  readonly text: string;
  readonly evidence: EvidenceRange | null;
}

function firstEvidenceRange(text: string): EvidenceRange {
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

function exactEvidenceRange(text: string, quote: unknown): EvidenceRange | null {
  if (typeof quote !== "string") return null;
  const trimmed = quote.trim();
  if (trimmed.length === 0) return null;
  const startOffset = text.indexOf(trimmed);
  if (startOffset === -1 || text.indexOf(trimmed, startOffset + 1) !== -1) return null;
  return {
    startOffset,
    endOffset: startOffset + trimmed.length,
    quote: trimmed,
  };
}

function sentenceEvidenceRanges(text: string): readonly EvidenceRange[] {
  const ranges: EvidenceRange[] = [];
  for (const match of text.matchAll(/[^.!?]+[.!?]+|[^.!?]+$/gu)) {
    const raw = match[0];
    let cursor = raw.search(/[^\s"'“”]/u);
    if (cursor === -1) continue;

    while (cursor < raw.length) {
      while (/\s/u.test(raw[cursor] ?? "")) cursor += 1;
      if (cursor >= raw.length) break;

      const maximumEnd = Math.min(raw.length, cursor + maximumQuoteLength);
      const whitespaceBoundary =
        maximumEnd < raw.length ? raw.lastIndexOf(" ", maximumEnd) : -1;
      const end = whitespaceBoundary > cursor ? whitespaceBoundary : maximumEnd;
      const quote = raw.slice(cursor, end).trimEnd();
      if (quote.length > 0) {
        const startOffset = (match.index ?? 0) + cursor;
        ranges.push({
          startOffset,
          endOffset: startOffset + quote.length,
          quote,
        });
      }
      cursor = Math.max(end, cursor + 1);
    }
  }
  return ranges;
}

function meaningfulWords(value: string): ReadonlySet<string> {
  const ignored = new Set([
    "what",
    "which",
    "where",
    "when",
    "does",
    "this",
    "that",
    "with",
    "from",
    "into",
    "after",
    "before",
    "section",
    "audience",
    "situation",
  ]);
  return new Set(
    value
      .toLocaleLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((word) => word.length >= 4 && !ignored.has(word)) ?? [],
  );
}

function bestEvidenceRange(text: string, question: string): EvidenceRange {
  const words = meaningfulWords(question);
  const ranges = sentenceEvidenceRanges(text);
  let best = ranges[0] ?? firstEvidenceRange(text);
  let bestScore = -1;
  for (const range of ranges) {
    const sentenceWords = meaningfulWords(range.quote);
    const score = [...words].filter((word) => sentenceWords.has(word)).length;
    if (score > bestScore) {
      best = range;
      bestScore = score;
    }
  }
  return best;
}

function evidenceFromRecord(
  value: Record<string, unknown>,
  text: string,
): EvidenceRange | null {
  const evidence = value["evidence"];
  if (!Array.isArray(evidence)) return null;
  for (const item of evidence) {
    if (typeof item !== "object" || item === null) continue;
    const range = exactEvidenceRange(text, (item as Record<string, unknown>)["quote"]);
    if (range !== null) return range;
  }
  return null;
}

function collectRecoveredQuestions(
  value: unknown,
  sourceText: string,
  found: RecoveredQuestion[],
  seen: Set<string>,
  depth = 0,
): void {
  if (depth > 7 || found.length >= maximumRecoveredQuestions) return;
  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecoveredQuestions(item, sourceText, found, seen, depth + 1);
    }
    return;
  }
  if (typeof value !== "object" || value === null) return;

  const record = value as Record<string, unknown>;
  const possibleText =
    typeof record["text"] === "string"
      ? record["text"]
      : typeof record["question"] === "string"
        ? record["question"]
        : null;
  if (possibleText !== null) {
    const question = possibleText.replace(/\s+/gu, " ").trim().slice(0, 400);
    const key = question.toLocaleLowerCase();
    if (question.length >= 5 && question.endsWith("?") && !seen.has(key)) {
      seen.add(key);
      found.push({
        text: question,
        evidence: evidenceFromRecord(record, sourceText),
      });
    }
  }

  for (const nested of Object.values(record)) {
    collectRecoveredQuestions(nested, sourceText, found, seen, depth + 1);
  }
}

function likelyNamedSubject(text: string): string | null {
  const titled = text.match(
    /\b(?:Captain|Doctor|Dr|King|Queen|Professor|Sir)\s+[A-Z][\p{L}'’-]+\b/u,
  )?.[0];
  if (titled !== undefined) return titled;

  const ignored = new Set([
    "The",
    "This",
    "That",
    "These",
    "Those",
    "When",
    "Where",
    "With",
    "Inside",
    "Outside",
    "Behind",
    "Beyond",
    "After",
    "Before",
    "Every",
    "Seeing",
    "As",
  ]);
  const counts = new Map<string, number>();
  for (const match of text.matchAll(/\b[A-Z][\p{L}'’-]{2,}\b/gu)) {
    const name = match[0];
    if (ignored.has(name)) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return (
    [...counts.entries()].sort(
      ([leftName, leftCount], [rightName, rightCount]) =>
        rightCount - leftCount || leftName.localeCompare(rightName),
    )[0]?.[0] ?? null
  );
}

function quantitativeContrast(text: string): readonly [string, string] | null {
  const matches = text.match(
    /\b(?:\d[\d,]*|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:\s+(?:hundred|thousand|million|billion))?\b/giu,
  );
  const unique = [
    ...new Map(
      (matches ?? []).map((value) => [
        value.toLocaleLowerCase(),
        value.toLocaleLowerCase(),
      ]),
    ).values(),
  ];
  return unique.length >= 2 && unique[0] !== undefined && unique[1] !== undefined
    ? [unique[0], unique[1]]
    : null;
}

function reversalQuestion(text: string): string | null {
  const reversal = sentenceEvidenceRanges(text).find((range) =>
    /\b(?:retreat|retreated|withdraw|withdrew|surrender|surrendered)\b/iu.test(
      range.quote,
    ),
  );
  if (reversal === undefined) return null;
  const subject = likelyNamedSubject(reversal.quote)?.replace(/[’']s$/iu, "") ?? null;
  const displaySubject =
    subject !== null &&
    reversal.quote.toLocaleLowerCase().includes(`the ${subject.toLocaleLowerCase()}`)
      ? `the ${subject}`
      : subject;
  return subject === null
    ? "What specifically causes the opposition to retreat or change course at this point?"
    : `What specifically causes ${displaySubject} to retreat or change course at this point?`;
}

function heuristicQuestions(text: string, ordinal: number): readonly string[] {
  const narrativeSignals =
    /["“”]|\b(?:asked|bellowed|fought|stood|turned|drew|surged|retreated|blade|fortress|castle)\b/iu;
  const isNarrative = narrativeSignals.test(text);
  const subject = likelyNamedSubject(text);

  if (isNarrative) {
    if (ordinal > 0) {
      const reversal = reversalQuestion(text);
      return [
        reversal ??
          (subject === null
            ? "What causes the central character's situation to change in this section?"
            : `What causes ${subject}'s situation to change in this section?`),
        subject === null
          ? "What personal cost or consequence does the central character carry out of this moment?"
          : `What personal cost or consequence does ${subject} carry out of this moment?`,
        "Which new uncertainty should the audience carry forward from this moment?",
      ];
    }
    const contrast = quantitativeContrast(text);
    return [
      ...(contrast === null
        ? []
        : [
            `How can a group of ${contrast[0]} realistically withstand a group of ${contrast[1]}?`,
          ]),
      subject === null
        ? "What is driving the central character's choices in this section?"
        : `What is driving ${subject}'s choices in this section?`,
      subject === null
        ? "What does the central character stand to lose if this situation goes wrong?"
        : `What does ${subject} stand to lose if this situation goes wrong?`,
      "What change or consequence should the audience expect after this moment?",
    ].slice(0, maximumRecoveredQuestions);
  }

  if (ordinal > 0) {
    return [
      "How does this section advance or qualify the central point established earlier?",
      "What new evidence or example would make this part more convincing?",
      "Which likely audience objection is still unanswered after this section?",
    ];
  }

  return [
    "What evidence or concrete example best supports the central claim in this section?",
    "What important objection, limitation, or edge case has not been addressed yet?",
    "What should the audience understand or do differently after this section?",
  ];
}

function questionKind(
  text: string,
):
  | "identity"
  | "motivation"
  | "causality"
  | "timeline"
  | "spatial_relation"
  | "promise_payoff"
  | "knowledge_gap" {
  const normalized = text.toLocaleLowerCase();
  if (normalized.startsWith("who")) return "identity";
  if (normalized.startsWith("when")) return "timeline";
  if (normalized.startsWith("where")) return "spatial_relation";
  if (normalized.includes("driving") || normalized.includes("motivat")) {
    return "motivation";
  }
  if (normalized.startsWith("why") || normalized.includes("cause")) {
    return "causality";
  }
  if (normalized.includes("happen next") || normalized.includes("expect after")) {
    return "promise_payoff";
  }
  return "knowledge_gap";
}

function semanticKey(text: string, ordinal: number, index: number): string {
  const normalized = text
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 190);
  return `recovery-${ordinal}-${index}-${normalized}`.slice(0, 240);
}

function factStatement(quote: string): string {
  const normalized = quote.replace(/\s+/gu, " ").trim();
  if (normalized.length >= 3) return normalized.slice(0, 500);
  return `This section explicitly contains: ${JSON.stringify(normalized)}.`;
}

/**
 * Produces a useful contract-valid result from exact source text. It first salvages
 * question text from a structurally imperfect model response, then fills any gap
 * with content-aware audience questions. Format drift must never strand a run or
 * leave a creator with a technically complete but empty report.
 */
export function buildSafeFallbackStepOutput(
  input: StepAnalysisInput,
  candidate?: unknown,
): StepAnalysisOutput {
  const evidence = firstEvidenceRange(input.currentSegment.text);
  const recovered: RecoveredQuestion[] = [];
  collectRecoveredQuestions(
    candidate,
    input.currentSegment.text,
    recovered,
    new Set<string>(),
  );
  const questionTexts = [
    ...recovered,
    ...heuristicQuestions(input.currentSegment.text, input.currentOrdinal).map(
      (text) => ({
        text,
        evidence: null,
      }),
    ),
  ].slice(0, Math.min(maximumRecoveredQuestions, input.limits.maxNewQuestions));

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
    questionOperations: questionTexts.map((question, index) => {
      const questionEvidence =
        question.evidence ??
        bestEvidenceRange(input.currentSegment.text, question.text);
      return {
        operationId: `operation_recovery_${input.currentOrdinal}_${index}_${input.currentSegment.id.slice(-16)}`,
        type: "open" as const,
        semanticKey: semanticKey(question.text, input.currentOrdinal, index),
        text: question.text,
        kind: questionKind(question.text),
        severity:
          questionKind(question.text) === "knowledge_gap"
            ? "clarity_risk"
            : "curiosity",
        evidence: [
          {
            segmentId: input.currentSegment.id,
            ...questionEvidence,
          },
        ],
        rationale:
          "A thoughtful first audience could reasonably ask this after the cited passage.",
        minimalClarification: null,
      };
    }),
    warnings: [
      "Ghost Audience repaired an unexpected model response format and preserved an evidence-backed audience read.",
    ],
  };
}
