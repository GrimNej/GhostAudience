import {
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  AudienceQuestion,
} from "@ghost-audience/domain";

import {
  buildTimelineLayout,
} from "../domain/timeline-layout";
import {
  TimelineTable,
} from "./TimelineTable";

interface QuestionTimelineProps {
  readonly questions:
    readonly AudienceQuestion[];
  readonly segmentCount: number;
  readonly selectedQuestionId:
    string | null;
  readonly onSelectQuestion:
    (questionId: string) => void;
}

const cellWidth = 96;
const laneHeight = 58;
const labelWidth = 280;

export function QuestionTimeline({
  questions,
  segmentCount,
  selectedQuestionId,
  onSelectQuestion,
}: QuestionTimelineProps): JSX.Element {
  const layout = useMemo(
    () =>
      buildTimelineLayout(
        questions,
        segmentCount,
      ),
    [questions, segmentCount],
  );

  const [viewMode, setViewMode] =
    useState<"visual" | "table">("visual");
  const scrollRef =
    useRef<HTMLDivElement>(null);

  const width =
    labelWidth +
    Math.max(segmentCount, 1) * cellWidth;
  const height =
    Math.max(layout.lanes.length, 1) *
      laneHeight +
    44;

  return (
    <section
      className="timeline panel"
      aria-labelledby="timeline-title"
    >
      <div className="panel__header">
        <div>
          <p className="eyebrow">
            Question journey
          </p>
          <h2 id="timeline-title">
            Curiosity timeline
          </h2>
        </div>

        <div
          className="segmented-control"
          aria-label="Timeline view"
        >
          <button
            type="button"
            aria-pressed={
              viewMode === "visual"
            }
            onClick={() =>
              setViewMode("visual")
            }
          >
            Visual
          </button>
          <button
            type="button"
            aria-pressed={
              viewMode === "table"
            }
            onClick={() =>
              setViewMode("table")
            }
          >
            Table
          </button>
        </div>
      </div>

      {viewMode === "table" ? (
        <TimelineTable
          questions={questions}
          onSelectQuestion={
            onSelectQuestion
          }
        />
      ) : (
        <div
          ref={scrollRef}
          className="timeline__scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable visual curiosity timeline"
        >
          <svg
            width={width}
            height={height}
            role="img"
            aria-labelledby="timeline-svg-title timeline-svg-description"
          >
            <title id="timeline-svg-title">
              Audience question lifecycle
            </title>
            <desc id="timeline-svg-description">
              Questions run from the segment where
              they open to the segment where they
              resolve or remain active.
            </desc>

            {Array.from(
              { length: segmentCount },
              (_, ordinal) => {
                const x =
                  labelWidth +
                  ordinal * cellWidth;

                return (
                  <g key={ordinal}>
                    <line
                      x1={x}
                      x2={x}
                      y1={36}
                      y2={height}
                      className="timeline__grid"
                    />
                    <text
                      x={x + 8}
                      y={24}
                      className="timeline__heading"
                    >
                      S{ordinal + 1}
                    </text>
                  </g>
                );
              },
            )}

            {layout.lanes.map((lane) => {
              const question =
                questions.find(
                  (candidate) =>
                    candidate.id ===
                    lane.questionId,
                );

              if (question === undefined) {
                return null;
              }

              const y =
                44 +
                lane.row * laneHeight +
                laneHeight / 2;
              const x1 =
                labelWidth +
                lane.startOrdinal * cellWidth +
                12;
              const x2 =
                labelWidth +
                lane.endOrdinal * cellWidth +
                cellWidth -
                12;

              return (
                <g
                  key={question.id}
                  data-selected={
                    selectedQuestionId ===
                    question.id
                  }
                >
                  <text
                    x={8}
                    y={y + 5}
                    className="timeline__label"
                  >
                    {question.text.length > 38
                      ? `${question.text.slice(
                          0,
                          37,
                        )}…`
                      : question.text}
                  </text>

                  <line
                    x1={x1}
                    x2={Math.max(x1, x2)}
                    y1={y}
                    y2={y}
                    className={`timeline__thread timeline__thread--${question.status}`}
                  />

                  <circle
                    cx={x1}
                    cy={y}
                    r={8}
                    className="timeline__node timeline__node--open"
                  />

                  {question.resolvedAtOrdinal !==
                  null ? (
                    <circle
                      cx={x2}
                      cy={y}
                      r={9}
                      className={`timeline__node timeline__node--${question.status}`}
                    />
                  ) : null}

                  <foreignObject
                    x={0}
                    y={y - 22}
                    width={width}
                    height={44}
                  >
                    <button
                      type="button"
                      className="timeline__hit-area"
                      aria-label={`${question.text}. ${question.status}. Opened at segment ${
                        question.openedAtOrdinal +
                        1
                      }.`}
                      onClick={() =>
                        onSelectQuestion(
                          question.id,
                        )
                      }
                    >
                      <span className="visually-hidden">
                        Open question details
                      </span>
                    </button>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}