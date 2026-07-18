import type { StepAnalysisInput } from "@ghost-audience/contracts";
import type {
  AudienceQuestion,
  AudienceState,
  ScriptDocument,
  ScriptSegment,
} from "@ghost-audience/domain";
import { sha256 } from "@ghost-audience/parser";

const FORBIDDEN_REQUEST_KEYS = new Set([
  "fullScript",
  "remainingSegments",
  "nextSegment",
  "ending",
  "globalSummary",
  "futureCharacters",
  "intentContract",
  "desiredQuestions",
  "requiredKnowledge",
  "intentionalMysteries",
  "desiredUnresolvedQuestions",
  "scriptHash",
  "scriptVersionId",
  "segmentManifestHash",
]);

export interface BuildStepInputOptions {
  readonly requestId: string;
  readonly runId: string;
  readonly script: ScriptDocument;
  readonly currentSegment: ScriptSegment;
  readonly priorState: AudienceState;
  readonly prefixHashes: readonly string[];
  readonly promptVersion: string;
  readonly modelId: string;
}

const severityRank = {
  curiosity: 0,
  clarity_risk: 1,
  blocking_confusion: 2,
} as const;

function compareQuestionPriority(
  left: AudienceQuestion,
  right: AudienceQuestion,
): number {
  return (
    severityRank[right.severity] - severityRank[left.severity] ||
    right.lastChangedAtOrdinal - left.lastChangedAtOrdinal ||
    left.id.localeCompare(right.id)
  );
}

async function createTransportSegmentId(
  ordinal: number,
  priorPrefixHash: string,
  segmentHash: string,
): Promise<string> {
  const identity = await sha256(`${ordinal}:${priorPrefixHash}:${segmentHash}`);
  return `segment_prefix_${identity.slice(0, 32)}`;
}

export async function buildStepAnalysisInput(
  options: BuildStepInputOptions,
): Promise<StepAnalysisInput> {
  const ordinal = options.currentSegment.ordinal;
  const expectedPreviousOrdinal = ordinal - 1;
  if (options.priorState.processedThroughOrdinal !== expectedPreviousOrdinal) {
    throw new Error(
      `Prior state cursor mismatch: expected ${expectedPreviousOrdinal}, received ${options.priorState.processedThroughOrdinal}.`,
    );
  }

  const priorPrefixHash =
    ordinal === 0
      ? await sha256("ghost-audience:prefix:v1")
      : options.prefixHashes[ordinal - 1];
  const expectedNextPrefixHash = options.prefixHashes[ordinal];
  if (priorPrefixHash === undefined || expectedNextPrefixHash === undefined) {
    throw new Error(`Missing prefix hash for segment ${ordinal}.`);
  }

  const transportSegmentId = await createTransportSegmentId(
    ordinal,
    priorPrefixHash,
    options.currentSegment.sha256,
  );

  const inputWithoutIdempotency = {
    schemaVersion: "1.0" as const,
    requestId: options.requestId,
    runId: options.runId,
    currentOrdinal: ordinal,
    priorPrefixHash,
    expectedNextPrefixHash,
    currentSegment: {
      id: transportSegmentId,
      heading: options.currentSegment.heading,
      text: options.currentSegment.text,
      sha256: options.currentSegment.sha256,
    },
    priorAudienceState: {
      processedThroughOrdinal: options.priorState.processedThroughOrdinal,
      facts: options.priorState.facts
        .slice(-120)
        .map(({ id, statement, confidence }) => ({
          id,
          statement,
          confidence,
        })),
      assumptions: options.priorState.assumptions
        .slice(-80)
        .map(({ id, statement, strength, status }) => ({
          id,
          statement,
          strength,
          status,
        })),
      compactNarrativeState: options.priorState.compactNarrativeState,
    },
    activeQuestions: options.priorState.questions
      .filter(
        (question) =>
          question.status === "open" || question.status === "partially_answered",
      )
      .sort(compareQuestionPriority)
      .slice(0, 80)
      .map(
        ({
          id,
          semanticKey,
          text,
          kind,
          status,
          severity,
          openedAtOrdinal,
          lastChangedAtOrdinal,
        }) => ({
          id,
          semanticKey,
          text,
          kind,
          status,
          severity,
          openedAtOrdinal,
          lastChangedAtOrdinal,
        }),
      ),
    analysisPolicy: {
      preservePlausibleAmbiguity: true as const,
      avoidAudienceProbabilities: true as const,
      requireEvidence: true as const,
      ignoreExternalStoryKnowledge: true as const,
    },
    limits: {
      maxNewQuestions: 8,
      maxOperations: 20,
    },
  };

  assertNoForbiddenKeys(inputWithoutIdempotency);
  const idempotencyKey = await sha256(
    canonicalJson({
      schemaVersion: inputWithoutIdempotency.schemaVersion,
      runId: inputWithoutIdempotency.runId,
      currentOrdinal: inputWithoutIdempotency.currentOrdinal,
      priorPrefixHash: inputWithoutIdempotency.priorPrefixHash,
      expectedNextPrefixHash: inputWithoutIdempotency.expectedNextPrefixHash,
      currentSegment: inputWithoutIdempotency.currentSegment,
      priorAudienceState: inputWithoutIdempotency.priorAudienceState,
      activeQuestions: inputWithoutIdempotency.activeQuestions,
      promptVersion: options.promptVersion,
      modelId: options.modelId,
    }),
  );

  const result: StepAnalysisInput = {
    ...inputWithoutIdempotency,
    idempotencyKey,
  };
  assertNoForbiddenKeys(result);
  return result;
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalJson(nested)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertNoForbiddenKeys(value: unknown, path = "$"): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertNoForbiddenKeys(item, `${path}[${index}]`);
    }
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_REQUEST_KEYS.has(key)) {
      throw new Error(`Forbidden no-hindsight key ${path}.${key}.`);
    }
    assertNoForbiddenKeys(nested, `${path}.${key}`);
  }
}
