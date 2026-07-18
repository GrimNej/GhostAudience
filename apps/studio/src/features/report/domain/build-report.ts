import type { AudienceQuestion, IntentContract } from "@ghost-audience/domain";

export interface ReportModel {
  readonly title: string;
  readonly generatedAt: string;
  readonly providerLabel: string;
  readonly modelId: string | null;
  readonly scriptHash: string;
  readonly summary: string;
  readonly intendedQuestions: readonly AudienceQuestion[];
  readonly accidentalQuestions: readonly AudienceQuestion[];
  readonly blockingConfusions: readonly AudienceQuestion[];
  readonly unresolvedQuestions: readonly AudienceQuestion[];
  readonly resolvedQuestions: readonly AudienceQuestion[];
  readonly intentContract: IntentContract;
  readonly limitations: readonly string[];
}

export function buildReportModel(input: {
  readonly title: string;
  readonly generatedAt: string;
  readonly providerLabel: string;
  readonly modelId: string | null;
  readonly scriptHash: string;
  readonly questions: readonly AudienceQuestion[];
  readonly intentContract: IntentContract;
  readonly optionalSummary: string | null;
}): ReportModel {
  const accidentalQuestions = input.questions.filter(
    (question) => question.creatorDisposition === "accidental",
  );

  const blockingConfusions = input.questions.filter(
    (question) =>
      question.severity === "blocking_confusion" &&
      question.creatorDisposition !== "incorrect_ai_interpretation",
  );

  const intendedQuestions = input.questions.filter(
    (question) => question.creatorDisposition === "intended",
  );

  return {
    title: input.title,
    generatedAt: input.generatedAt,
    providerLabel: input.providerLabel,
    modelId: input.modelId,
    scriptHash: input.scriptHash,
    summary:
      input.optionalSummary ??
      "The structured findings below were generated without a separate final narrative summary.",
    intendedQuestions,
    accidentalQuestions,
    blockingConfusions,
    unresolvedQuestions: input.questions.filter(
      (question) =>
        question.status === "open" ||
        question.status === "partially_answered" ||
        question.status === "stale",
    ),
    resolvedQuestions: input.questions.filter(
      (question) => question.status === "resolved",
    ),
    intentContract: input.intentContract,
    limitations: [
      "The system surfaces plausible audience questions; it does not represent all viewers.",
      "Model pretraining knowledge cannot be perfectly erased for famous stories.",
      "Human readers remain necessary for artistic and cultural judgment.",
      "Evidence grounding reduces unsupported claims but does not guarantee a useful interpretation.",
    ],
  };
}
