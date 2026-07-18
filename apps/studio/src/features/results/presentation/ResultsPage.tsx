import type { AudienceQuestion, QuestionSeverity } from "@ghost-audience/domain";
import {
  BookOpenCheck,
  CheckCircle2,
  CircleHelp,
  Download,
  FileJson,
  Lightbulb,
  ListFilter,
  MessageCircleQuestion,
  Route,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { useQuestionReviewRepository } from "../../question-review/data/use-question-review-repository";
import { QuestionDetail } from "../../question-review/presentation/QuestionDetail";
import { downloadTextFile } from "../../report/data/download-text";
import { reportToMarkdown } from "../../report/data/markdown-export";
import { useReportData } from "../../report/data/use-report-data";
import { useTimelineData } from "../../timeline/data/use-timeline-data";
import { QuestionTimeline } from "../../timeline/presentation/QuestionTimeline";

type ResultsView = "overview" | "questions" | "journey" | "understanding";
type QuestionFilter = "all" | QuestionSeverity;

const validViews = new Set<ResultsView>([
  "overview",
  "questions",
  "journey",
  "understanding",
]);

const severityCopy: Record<QuestionSeverity, string> = {
  curiosity: "Healthy curiosity",
  clarity_risk: "Clarity risk",
  blocking_confusion: "Blocking confusion",
};

const kindCopy: Record<string, string> = {
  identity: "Identity",
  motivation: "Motivation",
  causality: "Cause and effect",
  timeline: "Timing",
  reference: "Reference",
  world_rule: "World rule",
  knowledge_gap: "Missing information",
  emotional_reaction: "Emotional response",
  promise_payoff: "Promise and payoff",
  possible_contradiction: "Possible contradiction",
  stakes: "Stakes",
  spatial_relation: "Location",
  other: "Audience question",
};

function viewFromSearch(value: string | null): ResultsView {
  return validViews.has(value as ResultsView) ? (value as ResultsView) : "overview";
}

function QuestionCard({
  question,
  onSelect,
}: {
  readonly question: AudienceQuestion;
  readonly onSelect: (questionId: string) => void;
}): JSX.Element {
  const evidence = question.evidence[0];
  return (
    <button
      type="button"
      className="question-card"
      data-severity={question.severity}
      onClick={() => onSelect(question.id)}
    >
      <span className="question-card__topline">
        <span className="severity-badge" data-severity={question.severity}>
          {severityCopy[question.severity]}
        </span>
        <span>{kindCopy[question.kind] ?? "Audience question"}</span>
      </span>
      <strong>{question.text}</strong>
      <span className="question-card__rationale">{question.rationale}</span>
      {evidence === undefined ? null : (
        <q className="question-card__evidence">{evidence.quote}</q>
      )}
      <span className="question-card__footer">
        Opened in section {question.openedAtOrdinal + 1}
        <span>{question.status.replaceAll("_", " ")}</span>
      </span>
    </button>
  );
}

function ResultsSummary({
  questions,
  factCount,
}: {
  readonly questions: readonly AudienceQuestion[];
  readonly factCount: number;
}): JSX.Element {
  const blocking = questions.filter(
    (question) => question.severity === "blocking_confusion",
  ).length;
  const clarity = questions.filter(
    (question) => question.severity === "clarity_risk",
  ).length;
  const curiosity = questions.filter(
    (question) => question.severity === "curiosity",
  ).length;

  if (questions.length === 0) {
    return (
      <p>
        The AI audience found {factCount} clear signals and no persistent questions.
        Review What they understood to see what landed.
      </p>
    );
  }

  if (blocking > 0) {
    return (
      <p>
        Your audience formed {questions.length} meaningful questions. {blocking}{" "}
        {blocking === 1 ? "question needs" : "questions need"} attention because the
        missing context may prevent your point from landing.
      </p>
    );
  }

  if (clarity > 0) {
    return (
      <p>
        Your audience formed {questions.length} meaningful questions. Most are useful
        curiosity, with {clarity} {clarity === 1 ? "point" : "points"} worth checking
        for clarity.
      </p>
    );
  }

  return (
    <p>
      The read found {curiosity} {curiosity === 1 ? "thread" : "threads"} of healthy
      curiosity and no major clarity risks.
    </p>
  );
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The workspace renders four explicit result states in one route.
export function ResultsPage(): JSX.Element {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<QuestionFilter>("all");
  const reviews = useQuestionReviewRepository();
  const { workspace, value } = useTimelineData(projectId ?? "");
  const { report } = useReportData(projectId ?? "");

  if (projectId === undefined) throw new Error("Results route is missing projectId.");
  if (workspace === undefined || value === undefined || report === undefined) {
    return (
      <div className="loading-state" aria-busy="true">
        Gathering your results...
      </div>
    );
  }

  if (workspace === null || workspace.script === null) {
    return (
      <section className="result-empty panel">
        <CircleHelp aria-hidden="true" size={28} />
        <h2>Add content to begin</h2>
        <p>Your audience results will appear here after the first analysis.</p>
        <Link className="button button--primary" to={`../script`}>
          Add content
        </Link>
      </section>
    );
  }

  if (workspace.latestRun === null) {
    return (
      <section className="result-empty panel">
        <Sparkles aria-hidden="true" size={28} />
        <h2>Your results are one step away</h2>
        <p>Start an audience read and this page will fill with grounded findings.</p>
        <Link className="button button--primary" to="../analyze">
          Start analysis
        </Link>
      </section>
    );
  }

  const runComplete =
    workspace.latestRun.status === "completed" ||
    workspace.latestRun.status === "completed_with_warnings";

  if (!runComplete) {
    const interrupted =
      workspace.latestRun.status === "failed" ||
      workspace.latestRun.status === "cancelled";
    return (
      <section className="result-empty panel">
        <Sparkles aria-hidden="true" size={28} />
        <h2>
          {interrupted
            ? "Your audience read needs one more try"
            : "The audience read is still in progress"}
        </h2>
        <p>
          {interrupted
            ? "Completed sections are safe. Continue the read from the Analysis page."
            : "You can watch each section complete on the Analysis page."}
        </p>
        <Link className="button button--primary" to="../analyze">
          {interrupted ? "Continue analysis" : "View progress"}
        </Link>
      </section>
    );
  }

  if (value === null || report === null) {
    return (
      <section className="result-empty panel">
        <Sparkles aria-hidden="true" size={28} />
        <h2>The audience read is still in progress</h2>
        <p>You can watch each section complete on the Analysis page.</p>
        <Link className="button button--primary" to="../analyze">
          View progress
        </Link>
      </section>
    );
  }

  const view = viewFromSearch(searchParams.get("view"));
  const questions = value.questions;
  const selected = questions.find((question) => question.id === selectedId) ?? null;
  const segmentsById = new Map(value.segments.map((segment) => [segment.id, segment]));
  const openQuestions = questions.filter((question) => question.status !== "resolved");
  const resolvedQuestions = questions.filter(
    (question) => question.status === "resolved",
  );
  const clarityRisks = questions.filter(
    (question) => question.severity !== "curiosity",
  );
  const priorityQuestions = [...clarityRisks, ...openQuestions].filter(
    (question, index, collection) =>
      collection.findIndex((candidate) => candidate.id === question.id) === index,
  );
  const filteredQuestions =
    questionFilter === "all"
      ? questions
      : questions.filter((question) => question.severity === questionFilter);

  function setView(nextView: ResultsView): void {
    setSearchParams(nextView === "overview" ? {} : { view: nextView });
  }

  return (
    <section className="results-workspace">
      <header className="results-hero">
        <div className="results-hero__copy">
          <span className="result-ready-badge">
            <CheckCircle2 aria-hidden="true" size={16} />
            Audience read complete
          </span>
          <h2>Meet the questions your real audience may bring.</h2>
          <ResultsSummary questions={questions} factCount={value.run.facts.length} />
        </div>
        <div className="results-hero__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() =>
              downloadTextFile(
                "audience-read.md",
                reportToMarkdown(report),
                "text/markdown",
              )
            }
          >
            <Download aria-hidden="true" size={17} />
            Markdown
          </button>
          <button
            type="button"
            className="button button--ghost"
            aria-label="Download results as JSON"
            onClick={() =>
              downloadTextFile(
                "audience-read.json",
                JSON.stringify(report, null, 2),
                "application/json",
              )
            }
          >
            <FileJson aria-hidden="true" size={18} />
          </button>
        </div>
      </header>

      <ul className="result-metrics" aria-label="Audience read summary">
        <li>
          <span className="result-metrics__label">
            <MessageCircleQuestion aria-hidden="true" size={18} /> Questions
          </span>
          <strong className="result-metrics__value">{questions.length}</strong>
          <small className="result-metrics__detail">
            {openQuestions.length} still active
          </small>
        </li>
        <li>
          <span className="result-metrics__label">
            <ShieldAlert aria-hidden="true" size={18} /> Clarity risks
          </span>
          <strong className="result-metrics__value">{clarityRisks.length}</strong>
          <small className="result-metrics__detail">
            {clarityRisks.length === 0 ? "Nothing urgent" : "Worth a closer look"}
          </small>
        </li>
        <li>
          <span className="result-metrics__label">
            <BookOpenCheck aria-hidden="true" size={18} /> Clear signals
          </span>
          <strong className="result-metrics__value">{value.run.facts.length}</strong>
          <small className="result-metrics__detail">Grounded in your text</small>
        </li>
        <li>
          <span className="result-metrics__label">
            <CheckCircle2 aria-hidden="true" size={18} /> Resolved
          </span>
          <strong className="result-metrics__value">{resolvedQuestions.length}</strong>
          <small className="result-metrics__detail">Questions paid off</small>
        </li>
      </ul>

      <nav className="results-tabs" aria-label="Results views">
        {(
          [
            ["overview", "Overview", Sparkles],
            ["questions", `Questions (${questions.length})`, MessageCircleQuestion],
            ["journey", "Reaction journey", Route],
            ["understanding", "What they understood", Lightbulb],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            aria-current={view === key ? "page" : undefined}
            onClick={() => setView(key)}
          >
            <Icon aria-hidden="true" size={17} />
            {label}
          </button>
        ))}
      </nav>

      {view === "overview" ? (
        <div className="results-overview">
          <section className="results-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Start here</p>
                <h3>
                  {clarityRisks.length > 0
                    ? "Questions to review first"
                    : "Strongest audience questions"}
                </h3>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setView("questions")}
              >
                See all questions
              </button>
            </div>
            {questions.length === 0 ? (
              <div className="quiet-state">
                <CheckCircle2 aria-hidden="true" size={24} />
                <div>
                  <strong>No persistent questions were recorded.</strong>
                  <p>
                    Open What landed to review the information the audience retained.
                  </p>
                </div>
              </div>
            ) : (
              <div className="question-list">
                {(priorityQuestions.length > 0 ? priorityQuestions : questions)
                  .slice(0, 5)
                  .map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      onSelect={setSelectedId}
                    />
                  ))}
              </div>
            )}
          </section>

          <aside className="results-aside">
            <section className="understanding-preview">
              <p className="eyebrow">Audience understanding</p>
              <h3>What landed clearly</h3>
              {value.run.facts.length === 0 ? (
                <p className="muted-copy">No stable facts were recorded.</p>
              ) : (
                <ul>
                  {value.run.facts.slice(0, 5).map((fact) => (
                    <li key={fact.id}>{fact.statement}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="text-button"
                onClick={() => setView("understanding")}
              >
                Review the full audience state
              </button>
            </section>
            <section className="next-step-card">
              <ListFilter aria-hidden="true" size={21} />
              <div>
                <strong>Shape the read as you review</strong>
                <p>
                  Open any question to mark it intended, acceptable, accidental, or a
                  misread.
                </p>
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      {view === "questions" ? (
        <section className="results-section">
          <div className="section-heading section-heading--stack-mobile">
            <div>
              <p className="eyebrow">Audience voice</p>
              <h3>Every question your audience raised</h3>
            </div>
            <fieldset className="filter-pills">
              <legend className="visually-hidden">Filter questions</legend>
              {(
                [
                  ["all", "All"],
                  ["curiosity", "Curiosity"],
                  ["clarity_risk", "Clarity risks"],
                  ["blocking_confusion", "Blocking"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={questionFilter === key}
                  onClick={() => setQuestionFilter(key)}
                >
                  {label}
                </button>
              ))}
            </fieldset>
          </div>
          {filteredQuestions.length === 0 ? (
            <div className="quiet-state">No questions match this filter.</div>
          ) : (
            <div className="question-list question-list--wide">
              {filteredQuestions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onSelect={setSelectedId}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {view === "journey" ? (
        <QuestionTimeline
          questions={questions}
          segmentCount={value.segments.length}
          selectedQuestionId={selectedId}
          onSelectQuestion={setSelectedId}
        />
      ) : null}

      {view === "understanding" ? (
        <div className="understanding-grid">
          <section className="understanding-column understanding-column--known">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Known</p>
                <h3>What the audience can support</h3>
              </div>
              <span>{value.run.facts.length}</span>
            </div>
            {value.run.facts.length === 0 ? (
              <p className="muted-copy">No stable facts were recorded.</p>
            ) : (
              <ol>
                {value.run.facts.map((fact) => (
                  <li key={fact.id}>
                    <span>{fact.statement}</span>
                    <small>{fact.confidence.replaceAll("_", " ")}</small>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <section className="understanding-column understanding-column--assumed">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Inferred</p>
                <h3>What the audience is assuming</h3>
              </div>
              <span>{value.run.assumptions.length}</span>
            </div>
            {value.run.assumptions.length === 0 ? (
              <p className="muted-copy">No active assumptions were recorded.</p>
            ) : (
              <ol>
                {value.run.assumptions.map((assumption) => (
                  <li key={assumption.id}>
                    <span>{assumption.statement}</span>
                    <small>{assumption.status}</small>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      ) : null}

      <details className="technical-details">
        <summary>Technical details</summary>
        <dl>
          <div>
            <dt>Analysis source</dt>
            <dd>
              {value.run.providerMode === "fixture"
                ? "Local preview"
                : "Connected audience model"}
            </dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{value.run.modelId}</dd>
          </div>
          <div>
            <dt>Sections read</dt>
            <dd>{value.segments.length}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>
              {value.run.completedAt === null
                ? "Not recorded"
                : new Date(value.run.completedAt).toLocaleString()}
            </dd>
          </div>
        </dl>
      </details>

      {selected === null ? null : (
        <QuestionDetail
          key={selected.id}
          question={selected}
          segments={segmentsById}
          onClose={() => setSelectedId(null)}
          onDispositionChange={async (questionId, disposition) => {
            await reviews.setDisposition(
              value.run.id,
              questionId,
              disposition,
              new Date().toISOString(),
            );
          }}
        />
      )}
    </section>
  );
}

export function LegacyResultsRedirect({
  view,
}: {
  readonly view: ResultsView;
}): JSX.Element {
  const { projectId } = useParams();
  if (projectId === undefined) throw new Error("Project route is missing projectId.");
  return <Navigate replace to={`/project/${projectId}/results?view=${view}`} />;
}

export function LegacyIntentRedirect(): JSX.Element {
  const { projectId } = useParams();
  if (projectId === undefined) throw new Error("Project route is missing projectId.");
  return <Navigate replace to={`/project/${projectId}/script#creator-context`} />;
}
