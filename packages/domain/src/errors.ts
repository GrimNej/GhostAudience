import type { QuestionStatus } from "./questions.js";

export abstract class DomainError extends Error {
  public abstract readonly code: string;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class InvalidIdentifierError extends DomainError {
  public readonly code = "INVALID_IDENTIFIER";

  public constructor(
    public readonly identifierKind: string,
    public readonly receivedValue: string,
  ) {
    super(
      `Invalid ${identifierKind} identifier: ${JSON.stringify(receivedValue)}`,
    );
  }
}

export class UnknownQuestionError extends DomainError {
  public readonly code = "UNKNOWN_QUESTION";

  public constructor(public readonly questionId: string) {
    super(`Question ${questionId} does not exist.`);
  }
}

export class DuplicateOperationError extends DomainError {
  public readonly code = "DUPLICATE_OPERATION";

  public constructor(public readonly operationId: string) {
    super(`Operation ${operationId} has already been applied.`);
  }
}

export class InvalidQuestionTransitionError extends DomainError {
  public readonly code = "INVALID_QUESTION_TRANSITION";

  public constructor(
    public readonly eventType: string,
    public readonly currentStatus: QuestionStatus | "absent",
    public readonly reason: string,
  ) {
    super(
      `Cannot apply ${eventType} while question status is ${currentStatus}: ${reason}`,
    );
  }
}

export class EvidenceValidationError extends DomainError {
  public readonly code = "INVALID_EVIDENCE";

  public constructor(
    public readonly reason: string,
    public readonly details: Readonly<Record<string, unknown>>,
  ) {
    super(`Evidence validation failed: ${reason}`);
  }
}

export class StateInvariantError extends DomainError {
  public readonly code = "STATE_INVARIANT_VIOLATION";

  public constructor(
    public readonly invariant: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(
      details === undefined
        ? `State invariant failed: ${invariant}`
        : `State invariant failed: ${invariant}; ${JSON.stringify(details)}`,
    );
  }
}