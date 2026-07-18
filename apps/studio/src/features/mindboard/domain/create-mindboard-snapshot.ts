import type { AudienceState } from "@ghost-audience/domain";

export interface MindboardSnapshot {
  readonly known: readonly string[];
  readonly assumed: readonly string[];
  readonly wondering: readonly string[];
  readonly contradicted: readonly string[];
}

export function createMindboardSnapshot(state: AudienceState): MindboardSnapshot {
  return {
    known: state.facts
      .filter((fact) => fact.supersededByFactId === null)
      .map((fact) => fact.statement),
    assumed: state.assumptions
      .filter((assumption) => assumption.status === "active")
      .map((assumption) => assumption.statement),
    wondering: state.questions
      .filter(
        (question) =>
          question.status === "open" ||
          question.status === "partially_answered" ||
          question.status === "stale",
      )
      .map((question) => question.text),
    contradicted: [
      ...state.assumptions
        .filter((assumption) => assumption.status === "refuted")
        .map((assumption) => assumption.statement),
      ...state.questions
        .filter((question) => question.status === "contradicted")
        .map((question) => question.text),
    ],
  };
}
