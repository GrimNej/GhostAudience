import type {
  AudienceQuestion,
  CreatorDisposition,
  ScriptSegment,
} from "@ghost-audience/domain";

interface QuestionDetailProps {
  readonly question: AudienceQuestion;
  readonly segments:
    ReadonlyMap<string, ScriptSegment>;
  readonly onDispositionChange:
    (
      questionId: string,
      disposition: CreatorDisposition,
    ) => Promise<void>;
  readonly onClose: () => void;
}

const dispositions:
  readonly {
    readonly value: CreatorDisposition;
    readonly label: string;
    readonly description: string;
  }[] = [
    {
      value: "intended",
      label: "Intended",
      description:
        "The question is part of the designed audience experience.",
    },
    {
      value: "acceptable",
      label: "Acceptable",
      description:
        "The interpretation is plausible and does not need a change.",
    },
    {
      value: "accidental",
      label: "Accidental",
      description:
        "The question indicates clarity work may be needed.",
    },
    {
      value:
        "incorrect_ai_interpretation",
      label: "AI misread",
      description:
        "The finding is unsupported or unhelpful.",
    },
  ];

export function QuestionDetail({
  question,
  segments,
  onDispositionChange,
  onClose,
}: QuestionDetailProps): JSX.Element {
  return (
    <aside
      className="question-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-title"
    >
      <div className="question-drawer__header">
        <div>
          <p className="eyebrow">
            {question.kind}
          </p>
          <h2 id="question-title">
            {question.text}
          </h2>
        </div>
        <button
          type="button"
          className="button button--ghost"
          onClick={onClose}
          aria-label="Close question details"
        >
          Close
        </button>
      </div>

      <div className="question-drawer__body">
        <dl className="question-facts">
          <div>
            <dt>Status</dt>
            <dd>{question.status}</dd>
          </div>
          <div>
            <dt>Severity</dt>
            <dd>{question.severity}</dd>
          </div>
          <div>
            <dt>Opened</dt>
            <dd>
              Segment{" "}
              {question.openedAtOrdinal + 1}
            </dd>
          </div>
        </dl>

        <section>
          <h3>Why this question appeared</h3>
          <p>{question.rationale}</p>
        </section>

        <section>
          <h3>Evidence</h3>
          <ul className="evidence-list">
            {question.evidence.map(
              (evidence) => {
                const segment =
                  segments.get(
                    evidence.segmentId,
                  );

                return (
                  <li
                    key={`${evidence.segmentId}:${evidence.startOffset}:${evidence.endOffset}`}
                  >
                    <blockquote>
                      {evidence.quote}
                    </blockquote>
                    <p>
                      {segment?.heading ??
                        `Segment ${
                          (segment?.ordinal ??
                            0) + 1
                        }`}
                    </p>
                  </li>
                );
              },
            )}
          </ul>
        </section>

        {question.minimalClarification !==
        null ? (
          <section>
            <h3>
              Smallest clarification to consider
            </h3>
            <p>
              {
                question.minimalClarification
              }
            </p>
            <p className="field__hint">
              This is a suggestion, not an
              automatic rewrite.
            </p>
          </section>
        ) : null}

        <fieldset className="disposition-fieldset">
          <legend>
            Is this question part of your intent?
          </legend>
          {dispositions.map(
            (disposition) => (
              <label
                key={disposition.value}
                className="disposition-option"
              >
                <input
                  type="radio"
                  name={`disposition-${question.id}`}
                  value={disposition.value}
                  checked={
                    question.creatorDisposition ===
                    disposition.value
                  }
                  onChange={() => {
                    void onDispositionChange(
                      question.id,
                      disposition.value,
                    );
                  }}
                />
                <span>
                  <strong>
                    {disposition.label}
                  </strong>
                  <small>
                    {disposition.description}
                  </small>
                </span>
              </label>
            ),
          )}
        </fieldset>
      </div>
    </aside>
  );
}