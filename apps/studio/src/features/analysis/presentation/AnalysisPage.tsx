import {
  CheckCircle2,
  Clock3,
  FileSearch,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { RunRecord } from "../../../infrastructure/db/records";
import { useProject } from "../../project/presentation/useProject";
import type { AnalysisController } from "../data/analysis-controller";
import { useAnalysisController } from "../data/use-analysis-controller";
import { useCapabilities } from "../data/use-capabilities";
import { AnalysisProgress } from "./AnalysisProgress";

function isActiveRunStatus(status: string): boolean {
  return status === "running" || status === "waiting_retry";
}

function friendlyFailure(message: string | null): string {
  if (message === null) return "The audience read was interrupted before it finished.";
  if (/validation|model output|response failed/iu.test(message)) {
    return "The audience model sent back an unusual response. Your completed sections are safe, and you can continue from where it stopped.";
  }
  if (/network|fetch|timeout|timed out/iu.test(message)) {
    return "The connection was interrupted. Your completed sections are safe.";
  }
  if (/constraint|key already exists|bulkadd|bulkerror/iu.test(message)) {
    return "A local save conflict interrupted this section. Your completed sections are safe, and continuing will retry it with a fresh event identity.";
  }
  if (/quota|storage.*full|disk.*full/iu.test(message)) {
    return "This browser is low on local storage. Free some browser storage or remove an older project, then continue the audience read.";
  }
  return message;
}

function ActiveAnalysis({
  run,
  projectId,
  totalSegments,
  controller,
}: {
  readonly run: RunRecord;
  readonly projectId: string;
  readonly totalSegments: number;
  readonly controller: AnalysisController;
}): JSX.Element {
  const navigate = useNavigate();
  const ensuredRun = useRef<string | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const active = isActiveRunStatus(run.status);
  const completed =
    run.status === "completed" || run.status === "completed_with_warnings";

  useEffect(() => {
    if (!active || ensuredRun.current === run.id) return;
    ensuredRun.current = run.id;
    void controller.resume(run.id).catch((error: unknown) => {
      setActionError(error instanceof Error ? error.message : "Unable to continue.");
    });
  }, [active, controller, run.id]);

  useEffect(() => {
    if (!completed) return;
    const timeout = window.setTimeout(() => {
      void navigate(`/project/${projectId}/results`, { replace: true });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [completed, navigate, projectId]);

  async function retry(): Promise<void> {
    if (working) return;
    setWorking(true);
    setActionError(null);
    try {
      await controller.resume(run.id);
    } catch (error: unknown) {
      setActionError(
        error instanceof Error
          ? error.message
          : "The audience read could not continue.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="analysis-experience">
      <AnalysisProgress
        currentOrdinal={run.committedThroughOrdinal}
        totalSegments={totalSegments}
        status={run.status}
        providerLabel={
          run.providerMode === "fixture" ? "Local preview" : "Connected audience model"
        }
        noFutureScenesSupplied
      />

      {run.status === "failed" || run.status === "cancelled" ? (
        <section className="analysis-recovery panel">
          <RefreshCw aria-hidden="true" size={24} />
          <div>
            <h3>Let&apos;s continue the audience read.</h3>
            <p>{friendlyFailure(run.failureMessage)}</p>
          </div>
          <button
            type="button"
            className="button button--primary"
            disabled={working}
            onClick={() => void retry()}
          >
            {working ? "Continuing..." : "Continue analysis"}
          </button>
        </section>
      ) : null}

      {completed ? (
        <section className="analysis-complete panel" aria-live="polite">
          <CheckCircle2 aria-hidden="true" size={25} />
          <div>
            <h3>Your audience read is ready.</h3>
            <p>Opening the questions, clarity risks, and audience understanding now.</p>
          </div>
          <Link className="button button--primary" to="../results">
            Open results
          </Link>
        </section>
      ) : null}

      {active ? (
        <button
          type="button"
          className="text-button text-button--danger"
          onClick={() => controller.cancel(run.id)}
        >
          Stop this analysis
        </button>
      ) : null}

      {actionError === null ? null : (
        <p role="alert" className="error-message">
          {actionError}
        </p>
      )}

      <details className="technical-details technical-details--centered">
        <summary>How this read works</summary>
        <p>
          Each section is read in order. The audience model receives the current section
          and only what the audience could already know. Creator context is compared
          afterward in this browser.
        </p>
        <dl>
          <div>
            <dt>Analysis source</dt>
            <dd>
              {run.providerMode === "fixture" ? "Local preview" : "Connected model"}
            </dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{run.modelId}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}

export function AnalysisPage(): JSX.Element {
  const { projectId } = useParams();
  const controller = useAnalysisController();
  const capabilities = useCapabilities();
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  if (projectId === undefined) throw new Error("Analysis route is missing projectId.");
  const requiredProjectId = projectId;
  const value = useProject(projectId);

  if (value === undefined || capabilities.isLoading) {
    return (
      <div className="loading-state" aria-busy="true">
        Preparing the audience read...
      </div>
    );
  }
  if (value === null || value.script === null) {
    return (
      <section className="result-empty panel">
        <FileSearch aria-hidden="true" size={28} />
        <h2>Add your content first</h2>
        <p>
          Paste a draft or import a supported file, then start the read in one click.
        </p>
        <Link className="button button--primary" to="../script">
          Add content
        </Link>
      </section>
    );
  }

  if (value.latestRun !== null) {
    return (
      <ActiveAnalysis
        run={value.latestRun}
        projectId={requiredProjectId}
        totalSegments={value.segments.length}
        controller={controller}
      />
    );
  }

  const capability = capabilities.data;
  const liveAvailable =
    capability?.liveAnalysisEnabled === true &&
    capability.providerMode === "watsonx" &&
    capability.modelId !== null &&
    capability.tokenBudget.remainingBeforeHardStop > 0;
  const fixtureAvailable = capability?.fixtureModeAvailable ?? true;

  async function start(): Promise<void> {
    if (starting) return;
    const providerMode = liveAvailable ? "watsonx" : "fixture";
    setStarting(true);
    setStartError(null);
    try {
      await controller.start({
        projectId: requiredProjectId,
        providerMode,
        modelId:
          providerMode === "watsonx" ? (capability?.modelId ?? "") : "fixture-v1",
        promptVersion: providerMode === "fixture" ? "fixture-v1" : "step-v1",
      });
    } catch (error: unknown) {
      setStartError(
        error instanceof Error ? error.message : "Unable to start analysis.",
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <section className="analysis-ready">
      <div className="analysis-ready__visual" aria-hidden="true">
        <span>
          <Sparkles size={24} />
        </span>
        <i />
        <span>
          <FileSearch size={24} />
        </span>
        <i />
        <span>
          <MessageCircleQuestion size={24} />
        </span>
      </div>
      <div className="analysis-ready__copy">
        <p className="eyebrow">Ready to listen</p>
        <h2>Your content is ready for its AI audience.</h2>
        <p>
          We found {value.segments.length}{" "}
          {value.segments.length === 1 ? "section" : "sections"} in{" "}
          {value.script.wordCount.toLocaleString()} words. The audience follows your
          content in order so later points cannot influence earlier reactions.
        </p>
        <div className="analysis-ready__meta">
          <span>
            <Clock3 aria-hidden="true" size={17} /> Usually a few minutes
          </span>
          <span>
            <CheckCircle2 aria-hidden="true" size={17} /> Evidence included
          </span>
        </div>
        <button
          type="button"
          className="button button--primary button--large"
          disabled={starting || (!liveAvailable && !fixtureAvailable)}
          onClick={() => void start()}
        >
          {starting ? "Starting the read..." : "Start audience analysis"}
          <Sparkles aria-hidden="true" size={19} />
        </button>
        {!liveAvailable && fixtureAvailable ? (
          <p className="field__hint">
            The connected model is unavailable, so this run will use the local preview.
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
