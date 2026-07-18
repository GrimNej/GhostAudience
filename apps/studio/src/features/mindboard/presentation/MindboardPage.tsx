import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMindboardData } from "../data/use-mindboard-data";

interface MindboardColumnProps {
  readonly title: string;
  readonly values: readonly string[];
  readonly emptyMessage: string;
}

function MindboardColumn({
  title,
  values,
  emptyMessage,
}: MindboardColumnProps): JSX.Element {
  return (
    <section className="mindboard__column" aria-labelledby={`mindboard-${title}`}>
      <h3 id={`mindboard-${title}`}>{title}</h3>
      {values.length === 0 ? (
        <p className="field__hint">{emptyMessage}</p>
      ) : (
        <ul>
          {values.map((value, index) => (
            <li key={`${title}-${index}-${value}`}>{value}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MindboardPage(): JSX.Element {
  const { projectId } = useParams();
  const { workspace, value } = useMindboardData(
    projectId,
    selectedOrdinal,
  );

  if (workspace === undefined || value === undefined) {
    return <div aria-busy="true">Loading mindboard…</div>;
  }
  if (value === null) {
    return <p>Run at least one analysis step to inspect audience state.</p>;
  }

  return (
    <section>
      <p className="eyebrow">Audience state</p>
      <h2>Mindboard</h2>
      <label className="field">
        <span>State after segment {value.ordinal + 1}</span>
        <input
          type="range"
          min={0}
          max={value.maximumOrdinal}
          value={value.ordinal}
          onChange={(event) => {
            setSelectedOrdinal(
              Number.parseInt(event.currentTarget.value, 10),
            );
          }}
        />
      </label>
      <p className="field__hint">
        {value.segment?.heading ?? `Segment ${value.ordinal + 1}`}
      </p>
      <div className="mindboard__grid">
        <MindboardColumn
          title="Known"
          values={value.snapshot.known}
          emptyMessage="No accepted facts yet."
        />
        <MindboardColumn
          title="Assumed"
          values={value.snapshot.assumed}
          emptyMessage="No active assumptions."
        />
        <MindboardColumn
          title="Wondering"
          values={value.snapshot.wondering}
          emptyMessage="No active questions."
        />
        <MindboardColumn
          title="Contradicted"
          values={value.snapshot.contradicted}
          emptyMessage="Nothing has been refuted or contradicted."
        />
      </div>
    </section>
  );
}