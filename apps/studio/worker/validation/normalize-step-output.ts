import type { StepAnalysisInput } from "@ghost-audience/contracts";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function array(value: unknown): readonly unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function uniqueOffset(text: string, quote: string): number | null {
  const first = text.indexOf(quote);
  if (first === -1 || text.indexOf(quote, first + 1) !== -1) return null;
  return first;
}

function normalizeEvidence(value: unknown, input: StepAnalysisInput): unknown {
  const source = record(value);
  if (source === null) return value;
  const quote = source["quote"];
  const exactQuote = typeof quote === "string" ? quote : null;
  const offset =
    exactQuote === null ? null : uniqueOffset(input.currentSegment.text, exactQuote);
  return {
    segmentId: offset === null ? source["segmentId"] : input.currentSegment.id,
    startOffset: offset === null ? source["startOffset"] : offset,
    endOffset:
      offset === null ? source["endOffset"] : offset + (exactQuote?.length ?? 0),
    quote,
  };
}

function normalizeEvidenceArray(value: unknown, input: StepAnalysisInput): unknown {
  const values = array(value);
  return values === null ? value : values.map((item) => normalizeEvidence(item, input));
}

function normalizeFact(value: unknown, input: StepAnalysisInput): unknown {
  const source = record(value);
  if (source === null) return value;
  return {
    id: source["id"],
    statement: source["statement"],
    confidence: source["confidence"],
    evidence: normalizeEvidenceArray(source["evidence"], input),
  };
}

function normalizeAssumption(value: unknown, input: StepAnalysisInput): unknown {
  const source = record(value);
  if (source === null) return value;
  return {
    id: source["id"],
    statement: source["statement"],
    strength: source["strength"],
    evidence: normalizeEvidenceArray(source["evidence"], input),
  };
}

function normalizeAssumptionUpdate(value: unknown, input: StepAnalysisInput): unknown {
  const source = record(value);
  if (source === null) return value;
  return {
    id: source["id"],
    status: source["status"],
    evidence: normalizeEvidenceArray(source["evidence"], input),
    rationale: source["rationale"],
  };
}

function normalizeQuestionOperation(value: unknown, input: StepAnalysisInput): unknown {
  const source = record(value);
  if (source === null) return value;
  const common = {
    operationId: source["operationId"],
    type: source["type"],
    evidence: normalizeEvidenceArray(source["evidence"], input),
    rationale: source["rationale"],
  };
  if (source["type"] !== "open") return { ...common, questionId: source["questionId"] };
  return {
    ...common,
    semanticKey: source["semanticKey"],
    text: source["text"],
    kind: source["kind"],
    severity: source["severity"],
    minimalClarification: source["minimalClarification"],
  };
}

function normalizeArray(
  value: unknown,
  normalize: (item: unknown) => unknown,
): unknown {
  const values = array(value);
  return values === null ? value : values.map(normalize);
}

/**
 * Removes only non-contract fields and corrects evidence offsets when the model's
 * quote has exactly one location in the current segment. It never invents claims
 * or accepts ambiguous evidence.
 */
export function normalizeStepOutput(input: StepAnalysisInput, value: unknown): unknown {
  const source = record(value);
  if (source === null) return value;
  return {
    schemaVersion: source["schemaVersion"],
    requestId: input.requestId,
    factsAdded: normalizeArray(source["factsAdded"], (item) =>
      normalizeFact(item, input),
    ),
    assumptionsAdded: normalizeArray(source["assumptionsAdded"], (item) =>
      normalizeAssumption(item, input),
    ),
    assumptionUpdates: normalizeArray(source["assumptionUpdates"], (item) =>
      normalizeAssumptionUpdate(item, input),
    ),
    questionOperations: normalizeArray(source["questionOperations"], (item) =>
      normalizeQuestionOperation(item, input),
    ),
    warnings: source["warnings"],
  };
}
