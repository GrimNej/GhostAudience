import { useState } from "react";
import { useParams } from "react-router-dom";
import { useProject } from "../../project/presentation/useProject";
import { useIntentActions } from "../data/use-intent-actions";
import type { IntentFormValue } from "../domain/intent-form";

function initialForm(value: ReturnType<typeof useProject>): IntentFormValue {
  const contract = value && value !== null ? value.project.intentContract : null;

  return {
    requiredKnowledgeText:
      contract?.requiredKnowledge.map((item) => item.statement).join("\n") ?? "",
    desiredQuestionsText:
      contract?.desiredQuestions.map((item) => item.question).join("\n") ?? "",
    forbiddenAssumptionsText:
      contract?.forbiddenAssumptions.map((item) => item.assumption).join("\n") ?? "",
    intentionalMysteriesText: contract?.intentionalMysteries.join("\n") ?? "",
    intendedEmotionalDirection: contract?.intendedEmotionalDirection ?? "",
    desiredUnresolvedQuestionsText:
      contract?.desiredUnresolvedQuestions.join("\n") ?? "",
  };
}

export function IntentPage(): JSX.Element {
  const { projectId } = useParams();
  if (projectId === undefined) {
    throw new Error("Intent route is missing projectId.");
  }

  const projectValue = useProject(projectId);
  const actions = useIntentActions(projectId);

  if (projectValue === undefined) {
    return <div aria-busy="true">Loading intent…</div>;
  }

  if (projectValue === null) {
    return <p>Project not found.</p>;
  }

  return (
    <IntentForm
      key={projectValue.project.updatedAt}
      initialValue={initialForm(projectValue)}
      onSave={actions.save}
    />
  );
}

interface IntentFormProps {
  readonly initialValue: IntentFormValue;
  readonly onSave: (value: IntentFormValue) => Promise<void>;
}

function IntentForm({ initialValue, onSave }: IntentFormProps): JSX.Element {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fields = [
    {
      key: "requiredKnowledgeText",
      label: "Audience should understand",
      hint: "One statement per line.",
    },
    {
      key: "desiredQuestionsText",
      label: "Audience should wonder",
      hint: "Questions you deliberately want to create.",
    },
    {
      key: "forbiddenAssumptionsText",
      label: "Audience should not assume",
      hint: "Interpretations that would derail the intended meaning.",
    },
    {
      key: "intentionalMysteriesText",
      label: "Intentional mysteries",
      hint: "Ambiguities the system should protect.",
    },
    {
      key: "desiredUnresolvedQuestionsText",
      label: "Questions allowed to remain unresolved",
      hint: "One question per line.",
    },
  ] as const;

  return (
    <form
      className="intent-form panel"
      onSubmit={(event) => {
        event.preventDefault();
        setSaving(true);
        setMessage(null);
        void onSave(value)
          .then(() => setMessage("Intent saved."))
          .catch((caught: unknown) =>
            setMessage(
              caught instanceof Error ? caught.message : "Intent could not be saved.",
            ),
          )
          .finally(() => setSaving(false));
      }}
    >
      <div className="panel__header">
        <div>
          <p className="eyebrow">Creator authority</p>
          <h2>Intent contract</h2>
        </div>
      </div>

      <div className="panel__body form-stack">
        {fields.map((field) => (
          <label key={field.key} className="field">
            <span className="field__label">{field.label}</span>
            <span className="field__hint">{field.hint}</span>
            <textarea
              className="text-area"
              value={value[field.key]}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  [field.key]: event.target.value,
                }))
              }
            />
          </label>
        ))}

        <label className="field">
          <span className="field__label">Intended emotional direction</span>
          <textarea
            className="text-area"
            value={value.intendedEmotionalDirection}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                intendedEmotionalDirection: event.target.value,
              }))
            }
          />
        </label>

        {message === null ? null : <p aria-live="polite">{message}</p>}

        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? "Saving…" : "Save intent"}
        </button>
      </div>
    </form>
  );
}
