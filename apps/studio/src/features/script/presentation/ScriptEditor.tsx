import { useId, useMemo, useState } from "react";

interface ScriptEditorProps {
  readonly initialTitle: string;
  readonly initialText: string;
  readonly disabled: boolean;
  readonly onSave: (title: string, text: string) => Promise<void>;
}

const hardWordLimit = 20_000;

function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

export function ScriptEditor({
  initialTitle,
  initialText,
  disabled,
  onSave,
}: ScriptEditorProps): JSX.Element {
  const titleId = useId();
  const textId = useId();
  const errorId = useId();

  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const wordCount = useMemo(() => countWords(text), [text]);

  const validationError =
    title.trim().length === 0
      ? "Enter a script title."
      : text.trim().length === 0
        ? "Paste or import script text."
        : wordCount > hardWordLimit
          ? `The script exceeds the ${hardWordLimit.toLocaleString()} word limit.`
          : null;

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (validationError !== null || saving || disabled) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await onSave(title.trim(), text.trim());
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "The script could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="script-editor panel"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <div className="panel__header">
        <div>
          <p className="eyebrow">Source</p>
          <h2>Script text</h2>
        </div>
        <output aria-live="polite" htmlFor={textId}>
          {wordCount.toLocaleString()} words
        </output>
      </div>

      <div className="panel__body form-stack">
        <label className="field" htmlFor={titleId}>
          <span className="field__label">Title</span>
          <input
            id={titleId}
            className="text-input"
            value={title}
            maxLength={200}
            disabled={disabled || saving}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="field" htmlFor={textId}>
          <span className="field__label">Script</span>
          <span className="field__hint">
            Plain text, Markdown, and Fountain are supported. Review segment boundaries
            before analysis.
          </span>
          <textarea
            id={textId}
            className="text-area script-editor__text"
            value={text}
            disabled={disabled || saving}
            aria-label="Script"
            aria-invalid={validationError !== null}
            aria-describedby={validationError === null ? undefined : errorId}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        {validationError !== null ? (
          <p id={errorId} className="field__error">
            {validationError}
          </p>
        ) : null}

        {saveError !== null ? (
          <p role="alert" className="field__error">
            {saveError}
          </p>
        ) : null}

        <div className="form-actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={disabled || saving || validationError !== null}
          >
            {saving ? "Saving…" : "Save and segment"}
          </button>
        </div>
      </div>
    </form>
  );
}
