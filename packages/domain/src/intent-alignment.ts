import type { AudienceState } from "./audience-state.js";
import type { IntentContract } from "./intent.js";

export interface IntentAlignmentFinding {
  readonly targetId: string;
  readonly kind: "knowledge" | "desired_question" | "forbidden_assumption";
  readonly status: "met" | "not_yet_met" | "violated" | "not_evaluable";
  readonly explanation: string;
}

export function evaluateIntentLocally(
  intent: IntentContract,
  state: AudienceState,
  currentOrdinal: number,
): readonly IntentAlignmentFinding[] {
  const normalizedFacts = state.facts.map((fact) => fact.statement.toLocaleLowerCase());
  const normalizedQuestions = state.questions.map((question) => question.text.toLocaleLowerCase());
  const normalizedAssumptions = state.assumptions
    .filter((assumption) => assumption.status === "active")
    .map((assumption) => assumption.statement.toLocaleLowerCase());

  return [
    ...intent.requiredKnowledge.map((target) => ({
      targetId: target.id,
      kind: "knowledge" as const,
      status: target.targetOrdinal !== null && currentOrdinal < target.targetOrdinal
        ? "not_yet_met" as const
        : normalizedFacts.some((statement) => statement.includes(target.statement.toLocaleLowerCase()))
          ? "met" as const
          : "not_yet_met" as const,
      explanation: "Compared only after neutral audience-state inference; this target never enters the model prompt.",
    })),
    ...intent.desiredQuestions.map((target) => ({
      targetId: target.id,
      kind: "desired_question" as const,
      status: normalizedQuestions.some((question) => question.includes(target.question.toLocaleLowerCase()))
        ? "met" as const
        : "not_yet_met" as const,
      explanation: "Matched locally against accepted question text.",
    })),
    ...intent.forbiddenAssumptions.map((target) => ({
      targetId: target.id,
      kind: "forbidden_assumption" as const,
      status: normalizedAssumptions.some((assumption) => assumption.includes(target.assumption.toLocaleLowerCase()))
        ? "violated" as const
        : "met" as const,
      explanation: "Checked locally after neutral inference.",
    })),
  ];
}