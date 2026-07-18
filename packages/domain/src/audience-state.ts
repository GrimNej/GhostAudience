import type { EvidenceSpan } from "./evidence.js";
import type { RunId } from "./ids.js";
import type { AudienceQuestion } from "./questions.js";

export interface AudienceFact {
  readonly id: string;
  readonly statement: string;
  readonly confidence:
    | "explicit"
    | "strong_inference"
    | "weak_inference";
  readonly evidence: readonly EvidenceSpan[];
  readonly firstKnownAtOrdinal: number;
  readonly supersededByFactId: string | null;
}

export interface AudienceAssumption {
  readonly id: string;
  readonly statement: string;
  readonly evidence: readonly EvidenceSpan[];
  readonly strength: "low" | "medium" | "high";
  readonly createdAtOrdinal: number;
  readonly status:
    | "active"
    | "confirmed"
    | "refuted"
    | "expired";
}

export interface AudienceState {
  readonly runId: RunId;
  readonly processedThroughOrdinal: number;
  readonly facts: readonly AudienceFact[];
  readonly assumptions: readonly AudienceAssumption[];
  readonly questions: readonly AudienceQuestion[];
  readonly compactNarrativeState: string;
  readonly revision: number;
  readonly appliedOperationIds: ReadonlySet<string>;
}

export function createEmptyAudienceState(
  runId: RunId,
): AudienceState {
  return {
    runId,
    processedThroughOrdinal: -1,
    facts: [],
    assumptions: [],
    questions: [],
    compactNarrativeState:
      "No narrative information has been revealed yet.",
    revision: 0,
    appliedOperationIds: new Set<string>(),
  };
}