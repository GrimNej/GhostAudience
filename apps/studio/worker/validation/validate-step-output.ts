import {
  StepAnalysisOutputSchema,
  type StepAnalysisInput,
  type StepAnalysisOutput,
} from "@ghost-audience/contracts";

import { ApiError } from "../errors";
import { assertNoForbiddenClaims } from "./forbidden-output";

function assertRequestId(
  input: StepAnalysisInput,
  output: StepAnalysisOutput,
): void {
  if (input.requestId !== output.requestId) {
    throw new ApiError(
      "INVARIANT_VIOLATION",
      502,
      "The model response request ID does not match.",
      false,
    );
  }
}

function assertOperationLimits(
  input: StepAnalysisInput,
  output: StepAnalysisOutput,
): void {
  if (
    output.questionOperations.length >
    input.limits.maxOperations
  ) {
    throw new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "The model returned too many operations.",
      false,
    );
  }

  const opened = output.questionOperations.filter(
    (operation) => operation.type === "open",
  );

  if (
    opened.length >
    input.limits.maxNewQuestions
  ) {
    throw new ApiError(
      "MODEL_OUTPUT_INVALID",
      502,
      "The model returned too many new questions.",
      false,
    );
  }
}

function assertKnownQuestionIds(
  input: StepAnalysisInput,
  output: StepAnalysisOutput,
): void {
  const known = new Set(
    input.activeQuestions.map(
      (question) => question.id,
    ),
  );

  for (const operation of output.questionOperations) {
    if (
      operation.type !== "open" &&
      !known.has(operation.questionId)
    ) {
      throw new ApiError(
        "MODEL_OUTPUT_INVALID",
        502,
        `The model referenced an unknown question ID.`,
        false,
      );
    }
  }
}

function assertEvidenceOnlyUsesCurrentSegment(
  input: StepAnalysisInput,
  output: StepAnalysisOutput,
): void {
  const spans = [
    ...output.factsAdded.flatMap(
      (fact) => fact.evidence,
    ),
    ...output.assumptionsAdded.flatMap(
      (assumption) => assumption.evidence,
    ),
    ...output.assumptionUpdates.flatMap(
      (update) => update.evidence,
    ),
    ...output.questionOperations.flatMap(
      (operation) => operation.evidence,
    ),
  ];

  for (const span of spans) {
    if (
      span.segmentId !==
      input.currentSegment.id
    ) {
      throw new ApiError(
        "EVIDENCE_INVALID",
        502,
        "A step response cited a segment other than the current segment.",
        false,
      );
    }
  }
}

function assertEvidenceText(
  input: StepAnalysisInput,
  output: StepAnalysisOutput,
): void {
  const text = input.currentSegment.text;

  const spans = [
    ...output.factsAdded.flatMap(
      (fact) => fact.evidence,
    ),
    ...output.assumptionsAdded.flatMap(
      (assumption) => assumption.evidence,
    ),
    ...output.assumptionUpdates.flatMap(
      (update) => update.evidence,
    ),
    ...output.questionOperations.flatMap(
      (operation) => operation.evidence,
    ),
  ];

  for (const span of spans) {
    const actual = text.slice(
      span.startOffset,
      span.endOffset,
    );

    if (actual !== span.quote) {
      throw new ApiError(
        "EVIDENCE_INVALID",
        502,
        "An evidence quote does not exactly match its offsets.",
        false,
      );
    }
  }
}

export function validateStepOutput(
  input: StepAnalysisInput,
  value: unknown,
): StepAnalysisOutput {
  const output =
    StepAnalysisOutputSchema.parse(value);

  assertRequestId(input, output);
  assertOperationLimits(input, output);
  assertKnownQuestionIds(input, output);
  assertEvidenceOnlyUsesCurrentSegment(
    input,
    output,
  );
  assertEvidenceText(input, output);
  assertNoForbiddenClaims(output);

  return output;
}