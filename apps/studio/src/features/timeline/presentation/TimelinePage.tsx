import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuestionReviewRepository } from "../../question-review/data/use-question-review-repository";
import { QuestionDetail } from "../../question-review/presentation/QuestionDetail";
import { useTimelineData } from "../data/use-timeline-data";
import { QuestionTimeline } from "./QuestionTimeline";

export function TimelinePage(): JSX.Element {
  const { projectId } = useParams();
  const reviews = useQuestionReviewRepository();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  if (projectId === undefined) {
    throw new Error("Timeline route is missing projectId.");
  }
  const { workspace, value } = useTimelineData(projectId);
  if (workspace === undefined || value === undefined) {
    return <div aria-busy="true">Loading timeline…</div>;
  }
  if (value === null) {
    return <p>Run an analysis to see the timeline.</p>;
  }
  const selected = value.questions.find((question) => question.id === selectedId) ?? null;
  const segmentsById = new Map(value.segments.map((segment) => [segment.id, segment]));
  return (
    <>
      <QuestionTimeline
        questions={value.questions}
        segmentCount={value.segments.length}
        selectedQuestionId={selectedId}
        onSelectQuestion={setSelectedId}
      />
      {selected === null ? null : (
        <QuestionDetail
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
    </>
  );
}