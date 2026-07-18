import type { QuestionOperation, StepAnalysisOutput } from "@ghost-audience/contracts";
import {
  areLikelyDuplicateQuestions,
  applyKnowledgeEvents,
  buildCompactNarrativeState,
  locateUniqueEvidenceQuote,
  normalizeSemanticKey,
  operationId,
  questionId,
  type AudienceQuestion,
  type AudienceState,
  type EvidenceSpan,
  type KnowledgeEvent,
  type QuestionEvent,
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

function stableKnowledgeOperationId(
  requestId: string,
  category: string,
  entityId: string,
  suffix = "",
): string {
  const safe = `${requestId}_${category}_${entityId}_${suffix}`
    .replace(/[^a-zA-Z0-9_-]/gu, "_")
    .slice(0, 118);
  return `knowledge_${safe}`;
}

export async function mapModelOutput(
  output: StepAnalysisOutput,
  priorState: AudienceState,
  currentSegment: ScriptSegment,
  expectedTransportSegmentId: string,
): Promise<MappedStepResult> {
  const questionEvents = await Promise.all(
    output.questionOperations.map((operation) =>
      mapQuestionOperation(
        operation,
        priorState.questions,
        currentSegment,
        priorState.runId,
        expectedTransportSegmentId,
      ),
    ),
  );

  const knownQuestionIds = new Set(
    priorState.questions.map((question) => question.id),
  );
  for (const event of questionEvents) {
    if (
      event.type !== "QUESTION_OPENED" &&
      !knownQuestionIds.has(event.questionId)
    ) {
      throw new Error(
        `Model referenced unknown question ${event.questionId}.`,
      );
    }
  }

  const knownFactIds = new Set(
    priorState.facts.map((fact) => fact.id),
  );
  const knownAssumptionIds = new Set(
    priorState.assumptions.map((assumption) => assumption.id),
  );
  const knowledgeEvents: KnowledgeEvent[] = [];

  for (const fact of output.factsAdded) {
    if (knownFactIds.has(fact.id)) {
      throw new Error(`Fact ID collision: ${fact.id}.`);
    }
    knownFactIds.add(fact.id);
    knowledgeEvents.push({
      operationId: stableKnowledgeOperationId(
        output.requestId,
        "fact-added",
        fact.id,
      ),
      type: "FACT_ADDED",
      fact: {
        id: fact.id,
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

  for (const assumption of output.assumptionsAdded) {
    if (knownAssumptionIds.has(assumption.id)) {
      throw new Error(
        `Assumption ID collision: ${assumption.id}.`,
      );
    }
    knownAssumptionIds.add(assumption.id);
    knowledgeEvents.push({
      operationId: stableKnowledgeOperationId(
        output.requestId,
        "assumption-added",
        assumption.id,
      ),
      type: "ASSUMPTION_ADDED",
      assumption: {
        id: assumption.id,
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

  for (const update of output.assumptionUpdates) {
    if (!knownAssumptionIds.has(update.id)) {
      throw new Error(
        `Model updated unknown assumption ${update.id}.`,
      );
    }
    const type =
      update.status === "confirmed"
        ? "ASSUMPTION_CONFIRMED"
        : update.status === "refuted"
          ? "ASSUMPTION_REFUTED"
          : "ASSUMPTION_EXPIRED";
    knowledgeEvents.push({
      operationId: stableKnowledgeOperationId(
        output.requestId,
        "assumption-update",
        update.id,
        update.status,
      ),
      type,
      assumptionId: update.id,
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
  priorQuestions: readonly AudienceQuestion[],
  currentSegment: ScriptSegment,
  runIdValue: AudienceState["runId"],
  expectedTransportSegmentId: string,
): Promise<QuestionEvent> {
  if (operation.type === "open") {
    const semanticKey = normalizeSemanticKey(
      operation.semanticKey,
    );
    const duplicate = priorQuestions.find((question) =>
      areLikelyDuplicateQuestions(
        question.semanticKey,
        semanticKey,
      ),
    );

    if (duplicate !== undefined) {
      return {
        operationId: operationId(operation.operationId),
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
      operationId: operationId(operation.operationId),
      type: "QUESTION_OPENED",
      question: {
        id: questionId(
          `question_${stableHash.slice(0, 24)}`,
        ),
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
        minimalClarification:
          operation.minimalClarification?.trim() ?? null,
      },
    };
  }

  const base = {
    operationId: operationId(operation.operationId),
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
  const direct = currentSegment.text.slice(
    span.startOffset,
    span.endOffset,
  );
  if (
    normalizeForEvidence(direct) ===
    normalizeForEvidence(span.quote)
  ) {
    return {
      segmentId: currentSegment.id,
      startOffset: span.startOffset,
      endOffset: span.endOffset,
      quote: span.quote,
    };
  }
  return locateUniqueEvidenceQuote(
    currentSegment,
    span.quote,
  );
}

function normalizeForEvidence(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();
}