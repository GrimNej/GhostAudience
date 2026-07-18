interface AnalysisProgressProps {
  readonly currentOrdinal: number;
  readonly totalSegments: number;
  readonly status:
    | "ready"
    | "running"
    | "waiting_retry"
    | "cancelled"
    | "failed"
    | "completed"
    | "completed_with_warnings";
  readonly providerLabel: string;
  readonly noFutureScenesSupplied: boolean;
}

export function AnalysisProgress({
  currentOrdinal,
  totalSegments,
  status,
  providerLabel,
  noFutureScenesSupplied,
}: AnalysisProgressProps): JSX.Element {
  const completed = Math.max(
    0,
    currentOrdinal + 1,
  );
  const percent =
    totalSegments === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (completed / totalSegments) * 100,
          ),
        );

  return (
    <section
      className="analysis-progress panel"
      aria-labelledby="analysis-progress-title"
    >
      <div className="panel__header">
        <div>
          <p className="eyebrow">Sequential run</p>
          <h2 id="analysis-progress-title">
            First-time audience analysis
          </h2>
        </div>
        <span
          className="provider-chip"
          data-provider={providerLabel}
        >
          {providerLabel}
        </span>
      </div>

      <div className="panel__body">
        <div className="progress-copy">
          <strong>
            Segment {Math.min(
              completed + 1,
              totalSegments,
            )} of {totalSegments}
          </strong>
          <span>{percent}% committed</span>
        </div>

        <progress
          value={completed}
          max={Math.max(totalSegments, 1)}
        >
          {percent}%
        </progress>

        <p
          className="analysis-invariant"
          data-valid={noFutureScenesSupplied}
        >
          <span aria-hidden="true">
            {noFutureScenesSupplied ? "✓" : "!"}
          </span>
          {noFutureScenesSupplied
            ? "No future scenes supplied to this step"
            : "Future-scene invariant failed"}
        </p>

        <p
          className="visually-hidden"
          aria-live="polite"
          aria-atomic="true"
        >
          Analysis status {status}. {completed} of{" "}
          {totalSegments} segments committed.
        </p>
      </div>
    </section>
  );
}