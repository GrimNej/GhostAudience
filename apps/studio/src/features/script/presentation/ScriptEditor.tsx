import { FileText, Sparkles, UploadCloud, WandSparkles, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import type { IntentFormValue } from "../../intent/domain/intent-form";

interface ScriptEditorProps {
  readonly initialTitle: string;
  readonly initialText: string;
  readonly initialContext: IntentFormValue;
  readonly disabled: boolean;
  readonly analysisLabel: string;
  readonly analysisHint: string;
  readonly onAnalyze: (
    title: string,
    text: string,
    fileName: string | null,
    context: IntentFormValue,
  ) => Promise<void>;
}

const hardWordLimit = 20_000;
const acceptedExtensions = [".txt", ".md", ".markdown", ".fountain"];

function countWords(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function titleFromFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const withoutExtension = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  return withoutExtension.replaceAll(/[_-]+/gu, " ").trim();
}

function acceptsFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  return acceptedExtensions.some((extension) => lowerName.endsWith(extension));
}

export function ScriptEditor({
  initialTitle,
  initialText,
  initialContext,
  disabled,
  analysisLabel,
  analysisHint,
  onAnalyze,
}: ScriptEditorProps): JSX.Element {
  const titleId = useId();
  const textId = useId();
  const errorId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialTitle);
  const [text, setText] = useState(initialText);
  const [fileName, setFileName] = useState<string | null>(null);
  const [context, setContext] = useState(initialContext);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const wordCount = useMemo(() => countWords(text), [text]);
  const approximateSections =
    wordCount <= 360 ? 1 : wordCount <= 900 ? 2 : Math.ceil(wordCount / 550);
  const validationError =
    text.trim().length === 0
      ? "Paste your content or import a supported file."
      : wordCount > hardWordLimit
        ? `This content exceeds the ${hardWordLimit.toLocaleString()} word limit.`
        : null;

  async function importFile(file: File): Promise<void> {
    if (!acceptsFile(file)) {
      setFormError("Choose a .txt, .md, .markdown, or .fountain file.");
      return;
    }
    const importedText = await file.text();
    if (importedText.trim().length === 0) {
      setFormError("That file is empty.");
      return;
    }
    setText(importedText);
    setFileName(file.name);
    setFormError(null);
    if (title.trim().length === 0) setTitle(titleFromFileName(file.name));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (validationError !== null || submitting || disabled) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onAnalyze(title.trim(), text.trim(), fileName, context);
    } catch (error: unknown) {
      setFormError(
        error instanceof Error
          ? error.message
          : "The analysis could not be started. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="content-composer"
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <header className="content-composer__intro">
        <div>
          <p className="eyebrow">Your speech, story, pitch, article, or script</p>
          <h2>What should your AI audience hear or read?</h2>
          <p>
            Paste the whole thing. Ghost Audience will divide it into sections and
            simulate the questions, confusion, and curiosity of a first audience.
          </p>
        </div>
        <ol className="content-composer__promise" aria-label="Three simple steps">
          <li>1. Add content</li>
          <li>2. We analyze</li>
          <li>3. You get answers</li>
        </ol>
      </header>

      <fieldset
        className={`import-zone${dragging ? " import-zone--dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files.item(0);
          if (file !== null) void importFile(file);
        }}
      >
        <legend className="visually-hidden">Import a content file</legend>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          aria-label="Import content file"
          accept=".txt,.md,.markdown,.fountain,text/plain,text/markdown"
          onChange={(event) => {
            const file = event.currentTarget.files?.item(0);
            if (file !== null && file !== undefined) void importFile(file);
          }}
        />
        <UploadCloud aria-hidden="true" size={26} />
        <div>
          <strong>Drop a file here</strong>
          <span>TXT, Markdown, or Fountain</span>
        </div>
        <button
          type="button"
          className="button button--secondary button--compact"
          onClick={() => fileInputRef.current?.click()}
        >
          Choose file
        </button>
      </fieldset>

      {fileName === null ? null : (
        <div className="imported-file">
          <FileText aria-hidden="true" size={18} />
          <span>{fileName}</span>
          <button
            type="button"
            aria-label="Remove imported filename"
            onClick={() => setFileName(null)}
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      )}

      <div className="composer-fields">
        <label className="field field--title" htmlFor={titleId}>
          <span className="field__label">
            Title <small>optional</small>
          </span>
          <input
            id={titleId}
            className="text-input"
            value={title}
            maxLength={200}
            disabled={disabled || submitting}
            placeholder="The title of your piece"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="field" htmlFor={textId}>
          <span className="field__label">Content</span>
          <textarea
            id={textId}
            className="text-area content-composer__text"
            value={text}
            disabled={disabled || submitting}
            aria-label="Content"
            aria-invalid={validationError !== null}
            aria-describedby={validationError === null ? undefined : errorId}
            placeholder="Paste the complete content here. You do not need to format or prepare sections."
            onChange={(event) => {
              setText(event.target.value);
              if (fileName !== null) setFileName(null);
            }}
          />
        </label>

        <div className="composer-stats" aria-live="polite">
          <span>{wordCount.toLocaleString()} words</span>
          {wordCount === 0 ? null : (
            <span>About {approximateSections} reading sections</span>
          )}
          <span>Up to {hardWordLimit.toLocaleString()} words</span>
        </div>
      </div>

      <details className="creator-context">
        <summary>
          <span className="creator-context__icon" aria-hidden="true">
            <WandSparkles size={18} />
          </span>
          <span>
            <strong>Add creator context</strong>
            <small>Optional. The analysis works without this.</small>
          </span>
        </summary>
        <div className="creator-context__body">
          <p>
            Use this only when you want to compare the audience read with a specific
            creative intention. It is not shown to the audience model.
          </p>
          <label className="field">
            <span className="field__label">What should the audience feel?</span>
            <textarea
              className="text-area text-area--compact"
              value={context.intendedEmotionalDirection}
              placeholder="For example: uneasy at first, then quietly hopeful"
              onChange={(event) =>
                setContext((current) => ({
                  ...current,
                  intendedEmotionalDirection: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Questions you want to create</span>
            <textarea
              className="text-area text-area--compact"
              value={context.desiredQuestionsText}
              placeholder="One optional question per line"
              onChange={(event) =>
                setContext((current) => ({
                  ...current,
                  desiredQuestionsText: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span className="field__label">Mysteries to protect</span>
            <textarea
              className="text-area text-area--compact"
              value={context.intentionalMysteriesText}
              placeholder="Anything that should stay ambiguous"
              onChange={(event) =>
                setContext((current) => ({
                  ...current,
                  intentionalMysteriesText: event.target.value,
                }))
              }
            />
          </label>
        </div>
      </details>

      {validationError !== null ? (
        <p id={errorId} className="field__error">
          {validationError}
        </p>
      ) : null}
      {formError !== null ? (
        <p role="alert" className="error-message">
          {formError}
        </p>
      ) : null}

      <footer className="content-composer__actions">
        <div>
          <Sparkles aria-hidden="true" size={18} />
          <span>{analysisHint}</span>
        </div>
        <button
          type="submit"
          className="button button--primary button--large"
          disabled={disabled || submitting || validationError !== null}
        >
          {submitting ? "Preparing your audience read..." : analysisLabel}
          <Sparkles aria-hidden="true" size={19} />
        </button>
      </footer>
    </form>
  );
}
