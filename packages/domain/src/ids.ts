import { InvalidIdentifierError } from "./errors.js";

declare const brandSymbol: unique symbol;

export type Brand<TValue, TBrand extends string> = TValue & {
  readonly [brandSymbol]: TBrand;
};

export type ProjectId = Brand<string, "ProjectId">;
export type ScriptId = Brand<string, "ScriptId">;
export type SegmentId = Brand<string, "SegmentId">;
export type RunId = Brand<string, "RunId">;
export type QuestionId = Brand<string, "QuestionId">;
export type OperationId = Brand<string, "OperationId">;

type StringId = ProjectId | ScriptId | SegmentId | RunId | QuestionId | OperationId;

function parseId<TId extends StringId>(value: string, label: string): TId {
  const normalized = value.trim();

  if (normalized.length < 8 || normalized.length > 128) {
    throw new InvalidIdentifierError(label, value);
  }

  if (!/^[a-zA-Z0-9_-]+$/u.test(normalized)) {
    throw new InvalidIdentifierError(label, value);
  }

  return normalized as TId;
}

export const projectId = (value: string): ProjectId =>
  parseId<ProjectId>(value, "project");

export const scriptId = (value: string): ScriptId => parseId<ScriptId>(value, "script");

export const segmentId = (value: string): SegmentId =>
  parseId<SegmentId>(value, "segment");

export const runId = (value: string): RunId => parseId<RunId>(value, "run");

export const questionId = (value: string): QuestionId =>
  parseId<QuestionId>(value, "question");

export const operationId = (value: string): OperationId =>
  parseId<OperationId>(value, "operation");
