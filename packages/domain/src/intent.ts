export interface IntentKnowledgeTarget {
  readonly id: string;
  readonly statement: string;
  readonly targetOrdinal: number | null;
}

export interface IntentQuestionTarget {
  readonly id: string;
  readonly question: string;
  readonly openByOrdinal: number | null;
  readonly resolveByOrdinal: number | null;
}

export interface IntentAssumptionTarget {
  readonly id: string;
  readonly assumption: string;
  readonly prohibitedThroughOrdinal: number | null;
}

export interface IntentContract {
  readonly requiredKnowledge: readonly IntentKnowledgeTarget[];
  readonly desiredQuestions: readonly IntentQuestionTarget[];
  readonly forbiddenAssumptions: readonly IntentAssumptionTarget[];
  readonly intentionalMysteries: readonly string[];
  readonly intendedEmotionalDirection: string | null;
  readonly desiredUnresolvedQuestions: readonly string[];
}

export const EMPTY_INTENT_CONTRACT: IntentContract = {
  requiredKnowledge: [],
  desiredQuestions: [],
  forbiddenAssumptions: [],
  intentionalMysteries: [],
  intendedEmotionalDirection: null,
  desiredUnresolvedQuestions: [],
};