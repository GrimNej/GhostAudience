import { EMPTY_INTENT_CONTRACT, type IntentContract } from "@ghost-audience/domain";

export interface IntentFormValue {
  readonly requiredKnowledgeText: string;
  readonly desiredQuestionsText: string;
  readonly forbiddenAssumptionsText: string;
  readonly intentionalMysteriesText: string;
  readonly intendedEmotionalDirection: string;
  readonly desiredUnresolvedQuestionsText: string;
}

function lines(value: string): readonly string[] {
  return [
    ...new Set(
      value
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    ),
  ];
}

export function toIntentContract(value: IntentFormValue): IntentContract {
  const requiredKnowledge = lines(value.requiredKnowledgeText).map(
    (statement, index) => ({
      id: `knowledge-${index + 1}`,
      statement,
      targetOrdinal: null,
    }),
  );

  const desiredQuestions = lines(value.desiredQuestionsText).map((question, index) => ({
    id: `desired-question-${index + 1}`,
    question,
    openByOrdinal: null,
    resolveByOrdinal: null,
  }));

  const forbiddenAssumptions = lines(value.forbiddenAssumptionsText).map(
    (statement, index) => ({
      id: `forbidden-assumption-${index + 1}`,
      assumption: statement,
      prohibitedThroughOrdinal: null,
    }),
  );

  return {
    ...EMPTY_INTENT_CONTRACT,
    requiredKnowledge,
    desiredQuestions,
    forbiddenAssumptions,
    intentionalMysteries: lines(value.intentionalMysteriesText),
    intendedEmotionalDirection: value.intendedEmotionalDirection.trim() || null,
    desiredUnresolvedQuestions: lines(value.desiredUnresolvedQuestionsText),
  };
}
