import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../project/presentation/useProject";
import { useAnalysisController } from "../data/use-analysis-controller";
import { useCapabilities } from "../data/use-capabilities";
import { AnalysisProgress } from "./AnalysisProgress";

const RESUMABLE_STATUSES = new Set([
  "ready",
  "running",
  "waiting_retry",
  "cancelled",
  "failed",
]);

function isActiveRunStatus(status: string): boolean {
  return ["running", "waiting_retry"].includes(status);
}

export function AnalysisPage(): JSX.Element {
  const { projectId } = useParams();
  const controller = useAnalysisController();
  const capabilities = useCapabilities();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (projectId === undefined) {
    throw new Error("Analysis route is missing projectId.");
  }

  const value = useProject(projectId);

  if (value === undefined || capabilities.isLoading) {
    return <div aria-busy="true">Loading analysis…</div>;
  }

  if (value === null || value.script === null) {
    return (
      <section>
        <h2>Add a script first</h2>
        <p>Analysis requires a saved and segmented script.</p>
      </section>
    );
  }

  const run = value.latestRun;
  const capability = capabilities.data;
  const fixtureAvailable = capability?.fixtureModeAvailable ?? true;
  const liveAvailable =
    capability?.liveAnalysisEnabled === true &&
    capability.providerMode === "watsonx" &&
    capability.modelId !== null &&
    capability.tokenBudget.remainingBeforeHardStop > 0;

  if (run === null) {
    const start = async (providerMode: "watsonx" | "fixture"): Promise<void> => {
      if (starting) return;
      setStarting(true);
      setStartError(null);
      try {
        await controller.start({
          projectId,
          providerMode,
          modelId:
            providerMode === "fixture" ? "fixture-v1" : (capability?.modelId ?? ""),
          promptVersion: providerMode === "fixture" ? "fixture-v1" : "step-v1",
        });
      } catch (error: unknown) {
        setStartError(
          error instanceof Error ? error.message : "Unable to start analysis.",
        );
      } finally {
        setStarting(false);
      }
    };

    return (
      <section className="analysis-start panel">
        <div className="panel__body">
          <p className="eyebrow">Ready</p>
          <h2>Analyze {value.segments.length} segments sequentially</h2>
          <p>
            Neutral step requests contain only prior accepted audience state and the
            current segment. Creator intent is evaluated locally afterward.
          </p>
          <div className="button-row">
            <button
              type="button"
              className="button button--primary"
              disabled={!fixtureAvailable || starting}
              onClick={() => {
                void start("fixture");
              }}
            >
              {starting ? "Starting…" : "Run reliable demo"}
            </button>
            <button
              type="button"
              className="button button--secondary"
              disabled={!liveAvailable || starting}
              onClick={() => {
                void start("watsonx");
              }}
            >
              Run live watsonx.ai
            </button>
          </div>
          {!liveAvailable ? (
            <p className="field__hint">
              Live watsonx.ai is unavailable, disabled, or inside the protected token
              reserve. Fixture mode remains available.
            </p>
          ) : null}
          {startError === null ? null : (
            <p role="alert" className="error-message">
              {startError}
            </p>
          )}
        </div>
      </section>
    );
  }

  const activeRun = isActiveRunStatus(run.status);
  const canResume = RESUMABLE_STATUSES.has(run.status);

  const resume = async (): Promise<void> => {
    if (starting) return;
    setStarting(true);
    setStartError(null);
    try {
      await controller.resume(run.id);
    } catch (error: unknown) {
      setStartError(
        error instanceof Error ? error.message : "Unable to resume analysis.",
      );
    } finally {
      setStarting(false);
    }
  };

  return (
    <section>
      <AnalysisProgress
        currentOrdinal={run.committedThroughOrdinal}
        totalSegments={value.segments.length}
        status={run.status}
        providerLabel={
          run.providerMode === "fixture"
            ? "Fixture mode"
            : `IBM watsonx.ai · ${run.modelId}`
        }
        noFutureScenesSupplied
      />
      {activeRun ? (
        <button
          type="button"
          className="button button--danger"
          onClick={() => controller.cancel(run.id)}
        >
          Cancel analysis
        </button>
      ) : null}
      {canResume ? (
        <button
          type="button"
          className="button button--primary"
          disabled={starting}
          onClick={() => {
            void resume();
          }}
        >
          {starting ? "Resuming…" : "Resume analysis"}
        </button>
      ) : null}
      {activeRun ? (
        <p className="field__hint">
          If another tab owns this run, it will remain the only tab allowed to commit a
          step.
        </p>
      ) : null}
      {run.failureMessage === null ? null : (
        <p role="alert" className="error-message">
          {run.failureMessage}
        </p>
      )}
      {startError === null ? null : (
        <p role="alert" className="error-message">
          {startError}
        </p>
      )}
    </section>
  );
}
