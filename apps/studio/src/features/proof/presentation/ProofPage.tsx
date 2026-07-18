import { useProofData } from "../data/use-proof-data";
import { evidenceValidityPercent } from "../domain/proof-metrics";
import { MetricCard } from "./MetricCard";

export function ProofPage(): JSX.Element {
  const value = useProofData();
  if (value === undefined) {
    return (
      <div className="loading-state" aria-busy="true">
        Loading method details...
      </div>
    );
  }
  const evidence = value === null ? null : evidenceValidityPercent(value);
  return (
    <section className="proof-page">
      <p className="eyebrow">How Ghost Audience earns trust</p>
      <h1>Method and evidence</h1>
      <p className="page-lede">
        Every finding must cite your content. Each section is analyzed without future
        story information, and committed runs expose their validation metrics here.
      </p>
      {value === null ? (
        <p>Complete a run to populate runtime metrics.</p>
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard
              label="Future leaks accepted"
              value={String(value.futureLeakDetectionCount)}
              detail="Any detected leak rejects the step before commit. Differential prefix tests are the primary proof."
              status={value.futureLeakDetectionCount === 0 ? "pass" : "warning"}
            />
            <MetricCard
              label="Accepted evidence validity"
              value={evidence === null ? "No spans" : `${evidence.toFixed(1)}%`}
              detail={`${value.evidenceSpanCount} evidence spans passed exact quote and offset validation.`}
              status={evidence === null || evidence === 100 ? "pass" : "warning"}
            />
            <MetricCard
              label="Duplicate operations"
              value={String(value.duplicateOperationCount)}
              detail={`${value.acceptedOperationCount} immutable operations across ${value.committedStepCount} committed steps.`}
              status={value.duplicateOperationCount === 0 ? "pass" : "warning"}
            />
          </div>
          <dl className="question-facts">
            <div>
              <dt>Provider</dt>
              <dd>{value.providerMode}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{value.modelId}</dd>
            </div>
            <div>
              <dt>Prompt</dt>
              <dd>{value.promptVersion}</dd>
            </div>
            <div>
              <dt>Segments committed</dt>
              <dd>
                {value.committedStepCount}/{value.segmentCount}
              </dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}
