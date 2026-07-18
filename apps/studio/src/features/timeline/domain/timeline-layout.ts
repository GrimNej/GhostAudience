import type { AudienceQuestion } from "@ghost-audience/domain";

interface TimelineNode {
  readonly questionId: string;
  readonly ordinal: number;
  readonly status: string;
  readonly label: string;
}

interface TimelineLane {
  readonly questionId: string;
  readonly row: number;
  readonly startOrdinal: number;
  readonly endOrdinal: number;
  readonly nodes: readonly TimelineNode[];
}

export interface TimelineLayout {
  readonly segmentCount: number;
  readonly lanes: readonly TimelineLane[];
}

export function buildTimelineLayout(
  questions: readonly AudienceQuestion[],
  segmentCount: number,
): TimelineLayout {
  const sorted = [...questions].sort(
    (left, right) =>
      left.openedAtOrdinal - right.openedAtOrdinal ||
      left.text.localeCompare(right.text),
  );

  const rowEnds: number[] = [];
  const lanes: TimelineLane[] = [];

  for (const question of sorted) {
    const endOrdinal = question.resolvedAtOrdinal ?? question.lastChangedAtOrdinal;

    let row = rowEnds.findIndex((rowEnd) => rowEnd < question.openedAtOrdinal);

    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(endOrdinal);
    } else {
      rowEnds[row] = endOrdinal;
    }

    lanes.push({
      questionId: question.id,
      row,
      startOrdinal: question.openedAtOrdinal,
      endOrdinal,
      nodes: [
        {
          questionId: question.id,
          ordinal: question.openedAtOrdinal,
          status: "open",
          label: "Opened",
        },
        ...(question.resolvedAtOrdinal === null
          ? []
          : [
              {
                questionId: question.id,
                ordinal: question.resolvedAtOrdinal,
                status: question.status,
                label: question.status === "resolved" ? "Resolved" : question.status,
              },
            ]),
      ],
    });
  }

  return {
    segmentCount,
    lanes,
  };
}
