import type {
  AudienceQuestion,
} from "@ghost-audience/domain";

interface TimelineTableProps {
  readonly questions:
    readonly AudienceQuestion[];
  readonly onSelectQuestion:
    (questionId: string) => void;
}

export function TimelineTable({
  questions,
  onSelectQuestion,
}: TimelineTableProps): JSX.Element {
  return (
    <div className="table-scroll">
      <table>
        <caption>
          Question lifecycle by script segment
        </caption>
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">Kind</th>
            <th scope="col">Severity</th>
            <th scope="col">Opened</th>
            <th scope="col">Resolved</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="visually-hidden">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question) => (
            <tr key={question.id}>
              <th scope="row">
                {question.text}
              </th>
              <td>{question.kind}</td>
              <td>{question.severity}</td>
              <td>
                Segment{" "}
                {question.openedAtOrdinal + 1}
              </td>
              <td>
                {question.resolvedAtOrdinal ===
                null
                  ? "Not resolved"
                  : `Segment ${
                      question.resolvedAtOrdinal +
                      1
                    }`}
              </td>
              <td>{question.status}</td>
              <td>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() =>
                    onSelectQuestion(
                      question.id,
                    )
                  }
                >
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}