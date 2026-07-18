import { Check, LoaderCircle } from "lucide-react";

interface AnalysisProgressProps {
  readonly currentOrdinal: number;
  readonly totalSegments: number;
  readonly status:
    | "draft"
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
  const completed = Math.max(0, currentOrdinal + 1);
  const percent =
    totalSegments === 0
      ? 0
      : Math.min(100, Math.round((completed / totalSegments) * 100));
  const isComplete = status === "completed" || status === "completed_with_warnings";

  return (
    <section className="analysis-progress" aria-labelledby="analysis-progress-title">
      <div className="analysis-progress__orb" data-complete={isComplete}>
        {isComplete ? (
          <Check aria-hidden="true" size={34} />
        ) : (
          <LoaderCircle aria-hidden="true" size={34} />
        )}
      </div>
      <div className="analysis-progress__copy">
        <p className="eyebrow">
          {isComplete ? "Read complete" : "Audience read in progress"}
        </p>
        <h2 id="analysis-progress-title">
          {isComplete
            ? "Your results are ready."
            : "Simulating questions, confusion, and curiosity."}
        </h2>
        <p>
          {isComplete
            ? `All ${totalSegments} sections were read in content order.`
            : `Reading section ${Math.min(completed + 1, totalSegments)} of ${totalSegments}. You can leave this tab open while the read continues.`}
        </p>
      </div>
      <div className="analysis-progress__meter">
        <div className="progress-copy">
          <strong>
            {completed} of {totalSegments} sections complete
          </strong>
          <span>{percent}%</span>
        </div>
        <progress value={completed} max={Math.max(totalSegments, 1)}>
          {percent}%
        </progress>
        <div className="analysis-progress__notes">
          <span>
            <Check aria-hidden="true" size={15} /> Reacts in content order
          </span>
          <span>
            <Check aria-hidden="true" size={15} /> Grounds findings in your words
          </span>
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        Analysis status {status}. {completed} of {totalSegments} sections complete.{" "}
        {providerLabel}. Future content excluded: {String(noFutureScenesSupplied)}.
      </p>
    </section>
  );
}
