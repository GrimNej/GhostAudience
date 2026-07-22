import {
  type FinalizeRunInput,
  type FinalizeRunOutput,
  FinalizeRunOutputSchema,
  type StepAnalysisInput,
  type StepAnalysisOutput,
  StepAnalysisOutputSchema,
} from "@ghost-audience/contracts";
import { ApiError } from "../../errors";
import type {
  ModelCapabilities,
  NarrativeModelProvider,
  ProviderResult,
} from "../model-provider";

const ZERO_USAGE = {
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
} as const;

function evidence(input: StepAnalysisInput, quote: string) {
  const startOffset = input.currentSegment.text.indexOf(quote);
  if (startOffset < 0) {
    throw new ApiError(
      "EVIDENCE_INVALID",
      500,
      `Fixture quote not found: ${quote}`,
      false,
    );
  }
  return {
    segmentId: input.currentSegment.id,
    startOffset,
    endOffset: startOffset + quote.length,
    quote,
  };
}

function openQuestionId(input: StepAnalysisInput, semanticKey: string): string | null {
  return (
    input.activeQuestions.find((question) => question.semanticKey === semanticKey)
      ?.id ?? null
  );
}

function deterministicOperationId(input: StepAnalysisInput, suffix: string): string {
  return `op_${input.requestId}_${suffix}`
    .replace(/[^a-zA-Z0-9_-]/gu, "_")
    .slice(0, 120);
}

function isDemoStep(input: StepAnalysisInput): boolean {
  if (input.currentOrdinal === 0)
    return input.currentSegment.text.includes("Not again.");
  if (input.currentOrdinal === 1)
    return input.currentSegment.text.includes("She said never to touch that.");
  if (input.currentOrdinal === 2)
    return input.currentSegment.text.includes(
      "Anya brought me here the night the archive burned.",
    );
  return false;
}

function firstGroundedQuote(input: StepAnalysisInput): string {
  const text = input.currentSegment.text;
  const firstVisible = text.search(/\S/u);
  const startOffset = firstVisible < 0 ? 0 : firstVisible;
  const available = text.slice(startOffset);
  const maximumLength = Math.min(available.length, 220);
  const candidate = available.slice(0, maximumLength);
  const sentenceEnd = candidate.search(/[.!?](?:\s|$)/u);
  const preferredEnd = sentenceEnd >= 24 ? sentenceEnd + 1 : maximumLength;
  return candidate.slice(0, preferredEnd).trimEnd() || text.slice(0, 1);
}

function buildGenericStep(input: StepAnalysisInput): StepAnalysisOutput {
  const ordinal = input.currentOrdinal;
  const quote = firstGroundedQuote(input);
  const sectionNumber = ordinal + 1;
  return StepAnalysisOutputSchema.parse({
    schemaVersion: "1.0",
    requestId: input.requestId,
    factsAdded: [
      {
        id: `fact_fixture_${ordinal}_${input.currentSegment.id.slice(-12)}`,
        statement: `Section ${sectionNumber} presents this audience-visible point: ${quote}`,
        confidence: "explicit",
        evidence: [evidence(input, quote)],
      },
    ],
    assumptionsAdded: [],
    assumptionUpdates: [],
    questionOperations: [
      {
        operationId: deterministicOperationId(input, `section-${ordinal}-open`),
        type: "open",
        semanticKey: `knowledge-gap|section-${ordinal}|meaning-and-context`,
        text: `What context or explanation would help the audience understand the significance of section ${sectionNumber}?`,
        kind: "knowledge_gap",
        severity: "curiosity",
        evidence: [evidence(input, quote)],
        rationale:
          "A first-time audience may understand the words while still wanting their purpose or significance made clearer.",
        minimalClarification: null,
      },
    ],
    warnings: [
      "This section used deterministic local preview analysis because live inference was unavailable.",
    ],
  });
}

function buildDemoStep(input: StepAnalysisInput): StepAnalysisOutput {
  const ordinal = input.currentOrdinal;
  if (ordinal === 0) {
    return StepAnalysisOutputSchema.parse({
      schemaVersion: "1.0",
      requestId: input.requestId,
      factsAdded: [],
      assumptionsAdded: [
        {
          id: "assumption_mira_prior_visit",
          statement: "Mira may have been at the house before.",
          strength: "high",
          evidence: [evidence(input, "Not again.")],
        },
      ],
      assumptionUpdates: [],
      questionOperations: [
        {
          operationId: deterministicOperationId(input, "recognition-open"),
          type: "open",
          semanticKey: "motivation|mira|recognizes|house",
          text: "Why does Mira recognize the house?",
          kind: "motivation",
          severity: "curiosity",
          evidence: [evidence(input, "Not again.")],
          rationale:
            "Mira reacts as though the location is familiar before Leo establishes prior knowledge.",
          minimalClarification: null,
        },
      ],
      warnings: [],
    });
  }

  if (ordinal === 1) {
    return StepAnalysisOutputSchema.parse({
      schemaVersion: "1.0",
      requestId: input.requestId,
      factsAdded: [],
      assumptionsAdded: [],
      assumptionUpdates: [],
      questionOperations: [
        {
          operationId: deterministicOperationId(input, "reference-open"),
          type: "open",
          semanticKey: "reference|she|identity|speaker-reference",
          text: "Who does ‘she’ refer to?",
          kind: "reference",
          severity: "clarity_risk",
          evidence: [evidence(input, "She said never to touch that.")],
          rationale:
            "No previously established person has a unique claim to this pronoun.",
          minimalClarification:
            "Add one identifying cue only if the ambiguity is not intentional.",
        },
      ],
      warnings: [],
    });
  }

  if (ordinal === 2) {
    const priorVisitAssumption = input.priorAudienceState.assumptions.find(
      (assumption) =>
        assumption.statement === "Mira may have been at the house before.",
    );
    const recognitionId = openQuestionId(input, "motivation|mira|recognizes|house");
    const referenceId = openQuestionId(
      input,
      "reference|she|identity|speaker-reference",
    );
    const operations: unknown[] = [];
    if (recognitionId !== null) {
      operations.push({
        operationId: deterministicOperationId(input, "recognition-resolve"),
        type: "resolve",
        questionId: recognitionId,
        evidence: [
          evidence(input, "Anya brought me here the night the archive burned."),
        ],
        rationale:
          "Mira explicitly explains that Anya brought her to the house before.",
      });
    }
    if (referenceId !== null) {
      operations.push({
        operationId: deterministicOperationId(input, "reference-resolve"),
        type: "resolve",
        questionId: referenceId,
        evidence: [evidence(input, "beside her older sister, Anya")],
        rationale:
          "The photograph and Mira's dialogue identify Anya as the likely referent.",
      });
    }
    return StepAnalysisOutputSchema.parse({
      schemaVersion: "1.0",
      requestId: input.requestId,
      factsAdded: [
        {
          id: "fact_anya_brought_mira",
          statement: "Anya brought Mira to the house on the night the archive burned.",
          confidence: "explicit",
          evidence: [
            evidence(input, "Anya brought me here the night the archive burned."),
          ],
        },
      ],
      assumptionsAdded: [],
      assumptionUpdates:
        priorVisitAssumption === undefined
          ? []
          : [
              {
                id: priorVisitAssumption.id,
                status: "confirmed",
                evidence: [
                  evidence(input, "Anya brought me here the night the archive burned."),
                ],
                rationale: "Mira confirms a prior visit.",
              },
            ],
      questionOperations: operations,
      warnings: [],
    });
  }

  throw new ApiError(
    "INVALID_REQUEST",
    404,
    "The bundled fixture contains three segments only.",
    false,
  );
}

export class FixtureProvider implements NarrativeModelProvider {
  public readonly providerId = "fixture";

  public async analyzeStep(
    input: StepAnalysisInput,
  ): Promise<ProviderResult<StepAnalysisOutput>> {
    return {
      output: isDemoStep(input) ? buildDemoStep(input) : buildGenericStep(input),
      usage: ZERO_USAGE,
    };
  }

  public async finalizeRun(
    input: FinalizeRunInput,
  ): Promise<ProviderResult<FinalizeRunOutput>> {
    const firstResolved = input.questions.find(
      (question) => question.status === "resolved",
    );
    const firstBlocking = input.questions.find(
      (question) => question.severity === "blocking_confusion",
    );
    const output = FinalizeRunOutputSchema.parse({
      schemaVersion: "1.0",
      requestId: input.requestId,
      executiveSummary:
        "The deterministic demonstration traces audience questions from their opening evidence to later resolution while keeping creator intent outside neutral step inference.",
      strongestCuriosityArcs:
        firstResolved === undefined
          ? []
          : [
              {
                questionId: firstResolved.id,
                summary:
                  "This question opens from an early cue and later receives direct textual evidence.",
              },
            ],
      blockingConfusions:
        firstBlocking === undefined
          ? []
          : [
              {
                questionId: firstBlocking.id,
                summary: "This finding can obstruct comprehension until clarified.",
              },
            ],
      lateResolutions: [],
      abandonedPromises: [],
      intentAlignment: [
        "Creator intent is evaluated locally after neutral audience-state inference.",
      ],
      limitations: [
        "This output is a deterministic, pre-reviewed fixture rather than live inference.",
      ],
    });
    return { output, usage: ZERO_USAGE };
  }

  public async capabilities(): Promise<ModelCapabilities> {
    return {
      providerId: this.providerId,
      providerMode: "fixture",
      modelId: null,
      modelAvailable: true,
      checkedAt: new Date().toISOString(),
      promptVersions: {
        step: "fixture-v1",
        finalize: "fixture-v1",
      },
    };
  }
}
