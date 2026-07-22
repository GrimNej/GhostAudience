import type { QuestionOperation, StepAnalysisOutput } from "@ghost-audience/contracts";
import {
  type AudienceQuestion,
  type AudienceState,
  applyKnowledgeEvents,
  areLikelyDuplicateQuestions,
  buildCompactNarrativeState,
  type EvidenceSpan,
  type KnowledgeEvent,
  locateUniqueEvidenceQuote,
  normalizeSemanticKey,
  operationId,
  type QuestionEvent,
  questionId,
  type ScriptSegment,
} from "@ghost-audience/domain";
import { sha256 } from "@ghost-audience/parser";

export interface MappedStepResult {
  readonly questionEvents: readonly QuestionEvent[];
  readonly knowledgeEvents: readonly KnowledgeEvent[];
  readonly facts: AudienceState["facts"];
  readonly assumptions: AudienceState["assumptions"];
  readonly compactNarrativeState: string;
  readonly warnings: readonly string[];
}

async function stableMappedId(
  prefix: "operation" | "fact" | "assumption" | "knowledge",
  runIdValue: AudienceState["runId"],
  ordinal: number,
  position: string,
  sourceId: string,
): Promise<string> {
  const identity = await sha256(
    `ghost-audience:${prefix}:v1:${runIdValue}:${ordinal}:${position}:${sourceId}`,
  );
  return `${prefix}_${identity.slice(0, 32)}`;
}

export async function mapModelOutput(
  output: StepAnalysisOutput,
  priorState: AudienceState,
  currentSegment: ScriptSegment,
  expectedTransportSegmentId: string,
): Promise<MappedStepResult> {
  const questionEvents: QuestionEvent[] = [];
  const knownQuestions: Array<Pick<AudienceQuestion, "id" | "semanticKey">> = [
    ...priorState.questions,
  ];
  const knownQuestionIds = new Set(priorState.questions.map((question) => question.id));
  for (const [index, operation] of output.questionOperations.entries()) {
    const mappedOperationId = operationId(
      await stableMappedId(
        "operation",
        priorState.runId,
        currentSegment.ordinal,
        `${index}:${operation.type}`,
        operation.operationId,
      ),
    );
    const event = await mapQuestionOperation(
      operation,
      knownQuestions,
      currentSegment,
      priorState.runId,
      expectedTransportSegmentId,
      mappedOperationId,
    );
    if (event.type !== "QUESTION_OPENED" && !knownQuestionIds.has(event.questionId)) {
      throw new Error(`Model referenced unknown question ${event.questionId}.`);
    }
    if (event.type === "QUESTION_OPENED") {
      knownQuestionIds.add(event.question.id);
      knownQuestions.push(event.question);
    }
    questionEvents.push(event);
  }

  const knownAssumptionIds = new Set(
    priorState.assumptions.map((assumption) => assumption.id),
  );
  const knowledgeEvents: KnowledgeEvent[] = [];

  for (const [index, fact] of output.factsAdded.entries()) {
    const mappedFactId = await stableMappedId(
      "fact",
      priorState.runId,
      currentSegment.ordinal,
      String(index),
      fact.id,
    );
    knowledgeEvents.push({
      operationId: await stableMappedId(
        "knowledge",
        priorState.runId,
        currentSegment.ordinal,
        `fact-added:${index}`,
        fact.id,
      ),
      type: "FACT_ADDED",
      fact: {
        id: mappedFactId,
        statement: fact.statement.trim(),
        confidence: fact.confidence,
        evidence: fact.evidence.map((span) =>
          repairEvidence(span, currentSegment, expectedTransportSegmentId),
        ),
        firstKnownAtOrdinal: currentSegment.ordinal,
        supersededByFactId: null,
      },
    });
  }

  const assumptionAliases = new Map(
    priorState.assumptions.map((assumption) => [assumption.id, assumption.id]),
  );
  for (const [index, assumption] of output.assumptionsAdded.entries()) {
    const mappedAssumptionId = await stableMappedId(
      "assumption",
      priorState.runId,
      currentSegment.ordinal,
      String(index),
      assumption.id,
    );
    knownAssumptionIds.add(mappedAssumptionId);
    assumptionAliases.set(assumption.id, mappedAssumptionId);
    knowledgeEvents.push({
      operationId: await stableMappedId(
        "knowledge",
        priorState.runId,
        currentSegment.ordinal,
        `assumption-added:${index}`,
        assumption.id,
      ),
      type: "ASSUMPTION_ADDED",
      assumption: {
        id: mappedAssumptionId,
        statement: assumption.statement.trim(),
        strength: assumption.strength,
        evidence: assumption.evidence.map((span) =>
          repairEvidence(span, currentSegment, expectedTransportSegmentId),
        ),
        createdAtOrdinal: currentSegment.ordinal,
        status: "active",
      },
    });
  }

  for (const [index, update] of output.assumptionUpdates.entries()) {
    const mappedAssumptionId = assumptionAliases.get(update.id) ?? update.id;
    if (!knownAssumptionIds.has(mappedAssumptionId)) {
      throw new Error(`Model updated unknown assumption ${update.id}.`);
    }
    const type =
      update.status === "confirmed"
        ? "ASSUMPTION_CONFIRMED"
        : update.status === "refuted"
          ? "ASSUMPTION_REFUTED"
          : "ASSUMPTION_EXPIRED";
    knowledgeEvents.push({
      operationId: await stableMappedId(
        "knowledge",
        priorState.runId,
        currentSegment.ordinal,
        `assumption-update:${index}:${update.status}`,
        mappedAssumptionId,
      ),
      type,
      assumptionId: mappedAssumptionId,
      evidence: update.evidence.map((span) =>
        repairEvidence(span, currentSegment, expectedTransportSegmentId),
      ),
      rationale: update.rationale.trim(),
    });
  }

  const knowledgeState = applyKnowledgeEvents(
    priorState.facts,
    priorState.assumptions,
    knowledgeEvents,
  );
  const compactNarrativeState = buildCompactNarrativeState({
    facts: knowledgeState.facts,
    assumptions: knowledgeState.assumptions,
    questions: priorState.questions,
  });

  return {
    questionEvents,
    knowledgeEvents,
    facts: knowledgeState.facts,
    assumptions: knowledgeState.assumptions,
    compactNarrativeState,
    warnings: output.warnings,
  };
}

async function mapQuestionOperation(
  operation: QuestionOperation,
  priorQuestions: readonly Pick<AudienceQuestion, "id" | "semanticKey">[],
  currentSegment: ScriptSegment,
  runIdValue: AudienceState["runId"],
  expectedTransportSegmentId: string,
  mappedOperationId: ReturnType<typeof operationId>,
): Promise<QuestionEvent> {
  if (operation.type === "open") {
    const semanticKey = normalizeSemanticKey(operation.semanticKey);
    const duplicate = priorQuestions.find((question) =>
      areLikelyDuplicateQuestions(question.semanticKey, semanticKey),
    );

    if (duplicate !== undefined) {
      return {
        operationId: mappedOperationId,
        type: "QUESTION_REINFORCED",
        questionId: duplicate.id,
        evidence: operation.evidence.map((span) =>
          repairEvidence(span, currentSegment, expectedTransportSegmentId),
        ),
        rationale: operation.rationale.trim(),
      };
    }

    const stableHash = await sha256(
      `${runIdValue}:${currentSegment.ordinal}:${semanticKey}`,
    );
    return {
      operationId: mappedOperationId,
      type: "QUESTION_OPENED",
      question: {
        id: questionId(`question_${stableHash.slice(0, 24)}`),
        runId: runIdValue,
        semanticKey,
        text: operation.text.trim(),
        kind: operation.kind,
        severity: operation.severity,
        openedAtOrdinal: currentSegment.ordinal,
        lastChangedAtOrdinal: currentSegment.ordinal,
        evidence: operation.evidence.map((span) =>
          repairEvidence(span, currentSegment, expectedTransportSegmentId),
        ),
        rationale: operation.rationale.trim(),
        minimalClarification: operation.minimalClarification?.trim() ?? null,
      },
    };
  }

  const base = {
    operationId: mappedOperationId,
    questionId: questionId(operation.questionId),
    rationale: operation.rationale.trim(),
  };
  const evidence = operation.evidence.map((span) =>
    repairEvidence(span, currentSegment, expectedTransportSegmentId),
  );

  switch (operation.type) {
    case "reinforce":
      return {
        ...base,
        type: "QUESTION_REINFORCED",
        evidence,
      };
    case "partial_answer":
      return {
        ...base,
        type: "QUESTION_PARTIALLY_ANSWERED",
        answerEvidence: evidence,
      };
    case "resolve":
      return {
        ...base,
        type: "QUESTION_RESOLVED",
        answerEvidence: evidence,
      };
    case "contradict":
      return {
        ...base,
        type: "QUESTION_CONTRADICTED",
        evidence,
      };
    case "mark_stale":
      return {
        ...base,
        type: "QUESTION_MARKED_STALE",
      };
    case "reopen":
      return {
        ...base,
        type: "QUESTION_REOPENED",
        evidence,
      };
  }
}

function repairEvidence(
  span: {
    readonly segmentId: string;
    readonly startOffset: number;
    readonly endOffset: number;
    readonly quote: string;
  },
  currentSegment: ScriptSegment,
  expectedTransportSegmentId: string,
): EvidenceSpan {
  if (span.segmentId !== expectedTransportSegmentId) {
    throw new Error(
      `Step output referenced ${span.segmentId}; expected transport segment ${expectedTransportSegmentId}.`,
    );
  }
  const direct = currentSegment.text.slice(span.startOffset, span.endOffset);
  if (normalizeForEvidence(direct) === normalizeForEvidence(span.quote)) {
    return {
      segmentId: currentSegment.id,
      startOffset: span.startOffset,
      endOffset: span.endOffset,
      quote: span.quote,
    };
  }
  return locateUniqueEvidenceQuote(currentSegment, span.quote);
}

function normalizeForEvidence(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim();
}
