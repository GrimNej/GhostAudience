import {
  operationId,
  questionId,
  runId,
  segmentId,
  type AudienceQuestionDraft,
  type ScriptSegment,
} from "../src/index.js";

export const SEGMENT: ScriptSegment = {
  id: segmentId("segment_00000001"),
  ordinal: 0,
  kind: "scene",
  heading: "INT. HOUSE - NIGHT",
  text: "Mira stops at the door. She whispers, “Not again.”",
  globalStartOffset: 0,
  globalEndOffset: 52,
  sha256: "a".repeat(64),
};

export const QUESTION_DRAFT: AudienceQuestionDraft = {
  id: questionId("question_00000001"),
  runId: runId("run_00000001"),
  semanticKey:
    "motivation|mira|recognizes|house",
  text: "Why does Mira appear to recognize the house?",
  kind: "motivation",
  severity: "curiosity",
  openedAtOrdinal: 0,
  lastChangedAtOrdinal: 0,
  evidence: [
    {
      segmentId: SEGMENT.id,
      startOffset: 0,
      endOffset: SEGMENT.text.length,
      quote: SEGMENT.text,
    },
  ],
  rationale:
    "Her reaction implies prior experience that has not been explained.",
  minimalClarification: null,
};

export const OPEN_EVENT = {
  operationId: operationId("operation_00000001"),
  type: "QUESTION_OPENED",
  question: QUESTION_DRAFT,
} as const;