import { useParams } from "react-router-dom";
import { downloadTextFile } from "../data/download-text";
import { reportToMarkdown } from "../data/markdown-export";
import { useReportData } from "../data/use-report-data";

export function ReportPage(): JSX.Element {
  const { projectId } = useParams();
  const { workspace, report } = useReportData(projectId);

  if (workspace === undefined || report === undefined) {
    return <div aria-busy="true">Loading report…</div>;
  }
  if (report === null) {
    return <p>Run an analysis before exporting a report.</p>;
  }

  return (
    <section>
      <p className="eyebrow">Exportable analysis</p>
      <h2>Report</h2>
      <p>{report.summary}</p>
      <dl className="question-facts">
        <div>
          <dt>Accidental questions</dt>
          <dd>{report.accidentalQuestions.length}</dd>
        </div>
        <div>
          <dt>Blocking confusion</dt>
          <dd>{report.blockingConfusions.length}</dd>
        </div>
        <div>
          <dt>Resolved arcs</dt>
          <dd>{report.resolvedQuestions.length}</dd>
        </div>
        <div>
          <dt>Still unresolved</dt>
          <dd>{report.unresolvedQuestions.length}</dd>
        </div>
      </dl>
      <div className="button-row">
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            downloadTextFile(
              "audience-question-report.md",
              reportToMarkdown(report),
              "text/markdown",
            );
          }}
        >
          Download Markdown
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => {
            downloadTextFile(
              "audience-question-report.json",
              JSON.stringify(report, null, 2),
              "application/json",
            );
          }}
        >
          Download JSON
        </button>
      </div>
      <h3>Important findings</h3>
      <ul>
        {[
          ...report.blockingConfusions,
          ...report.accidentalQuestions,
        ].map((question) => (
          <li key={question.id}>
            <strong>{question.text}</strong> — {question.rationale}
          </li>
        ))}
      </ul>
    </section>
  );
}