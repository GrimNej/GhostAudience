const SAFE_LOG_FIELDS = [
  "requestId",
  "route",
  "status",
  "latencyMs",
  "providerId",
  "modelId",
  "promptVersion",
  "inputCharacterBucket",
  "operationCount",
  "errorCode",
  "retryCount",
  "ordinal",
] as const;

type SafeLogField = (typeof SAFE_LOG_FIELDS)[number];
type SafeLogValue = string | number | boolean | null;
export type SafeLogMetadata = Partial<Record<SafeLogField, SafeLogValue>>;

function projectSafeMetadata(metadata: SafeLogMetadata): SafeLogMetadata {
  const projected: SafeLogMetadata = {};
  for (const key of SAFE_LOG_FIELDS) {
    const value = metadata[key];
    if (value !== undefined) projected[key] = value;
  }
  return projected;
}

export class SafeLogger {
  public constructor(private readonly base: SafeLogMetadata) {}

  public info(event: string, metadata: SafeLogMetadata = {}): void {
    console.warn(
      JSON.stringify({
        level: "info",
        event,
        ...projectSafeMetadata(this.base),
        ...projectSafeMetadata(metadata),
      }),
    );
  }

  public warn(event: string, metadata: SafeLogMetadata = {}): void {
    console.warn(
      JSON.stringify({
        level: "warn",
        event,
        ...projectSafeMetadata(this.base),
        ...projectSafeMetadata(metadata),
      }),
    );
  }

  public error(event: string, metadata: SafeLogMetadata = {}): void {
    console.error(
      JSON.stringify({
        level: "error",
        event,
        ...projectSafeMetadata(this.base),
        ...projectSafeMetadata(metadata),
      }),
    );
  }
}
