import type { AudienceState } from "./audience-state.js";

const severityRank = { curiosity: 0, clarity_risk: 1, blocking_confusion: 2 } as const;

export function buildCompactNarrativeState(
  state: Pick<AudienceState, "facts" | "assumptions" | "questions">,
): string {
  const activeQuestions = state.questions
    .filter((question) => question.status === "open" || question.status === "partially_answered")
    .sort((left, right) =>
      severityRank[right.severity] - severityRank[left.severity]
      || right.lastChangedAtOrdinal - left.lastChangedAtOrdinal
      || left.id.localeCompare(right.id),
    )
    .slice(0, 40)
    .map(({ id, text, status, severity }) => ({ id, text, status, severity }));

  return JSON.stringify({
    knownFacts: state.facts
      .filter((fact) => fact.supersededByFactId === null)
      .slice(-80)
      .map(({ id, statement, confidence }) => ({ id, statement, confidence })),
    activeAssumptions: state.assumptions
      .filter((assumption) => assumption.status === "active")
      .slice(-50)
      .map(({ id, statement, strength }) => ({ id, statement, strength })),
    activeQuestions,
  });
}