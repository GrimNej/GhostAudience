import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../project/presentation/useProject";
import { useAnalysisController } from "../data/use-analysis-controller";
import { useCapabilities } from "../data/use-capabilities";
import { AnalysisProgress } from "./AnalysisProgress";

export function AnalysisPage(): JSX.Element {
  const { projectId } = useParams();
  const controller = useAnalysisController();
  const capabilities = useCapabilities();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] =
    useState<string | null>(null);

  if (projectId === undefined) {
    throw new Error(
      "Analysis route is missing projectId.",
    );
  }

  const value = useProject(projectId);

  if (value === undefined || capabilities.isLoading) {
    return <div aria-busy="true">Loading analysis…</div>;
  }

  if (value === null || value.script === null) {
    return (
      <section>
        <h2>Add a script first</h2>
        <p>
          Analysis requires a saved and segmented script.
        </p>
      </section>
    );
  }

  const run = value.latestRun;
  const capability = capabilities.data;
  const fixtureAvailable =
    capability?.fixtureModeAvailable ?? true;
  const liveAvailable =
    capability?.liveAnalysisEnabled === true &&
    capability.providerMode === "watsonx" &&
    capability.modelId !== null &&
    capability.tokenBudget.remainingBeforeHardStop > 0;

  if (run === null) {
    const start = async (
      providerMode: "watsonx" | "fixture",
    ): Promise<void> => {
      if (starting) return;
      setStarting(true);
      setStartError(null);
      try {
        await controller.start({
          projectId,
          providerMode,
          modelId:
            providerMode === "fixture"
              ? "fixture-v1"
              : capability?.modelId ?? "",
          promptVersion:
            providerMode === "fixture"
              ? "fixture-v1"
              : "step-v1",
        });
      } catch (error: unknown) {
        setStartError(
          error instanceof Error
            ? error.message
            : "Unable to start analysis.",
        );
      } finally {
        setStarting(false);
      }
    };

    return (
      <section className="analysis-start panel">
        <div className="panel__body">
          <p className="eyebrow">Ready</p>
          <h2>
            Analyze {value.segments.length} segments
            sequentially
          </h2>
          <p>
            Neutral step requests contain only prior accepted
            audience state and the current segment. Creator
            intent is evaluated locally afterward.
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
              Run live Granite
            </button>
          </div>
          {!liveAvailable ? (
            <p className="field__hint">
              Live Granite is unavailable, disabled, or inside
              the protected token reserve. Fixture mode remains
              available.
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

  return (
    <section>
      <AnalysisProgress
        currentOrdinal={run.committedThroughOrdinal}
        totalSegments={value.segments.length}
        status={run.status}
        providerLabel={
          run.providerMode === "fixture"
            ? "Fixture mode"
            : `IBM Granite · ${run.modelId}`
        }
        noFutureScenesSupplied
      />
      {run.status === "running" ||
      run.status === "waiting_retry" ? (
        <button
          type="button"
          className="button button--danger"
          onClick={() => controller.cancel(run.id)}
        >
          Cancel analysis
        </button>
      ) : null}
      {run.failureMessage === null ? null : (
        <p role="alert" className="error-message">
          {run.failureMessage}
        </p>
      )}
    </section>
  );
}