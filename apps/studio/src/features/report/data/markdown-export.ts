import type {
  AudienceQuestion,
} from "@ghost-audience/domain";

import type {
  ReportModel,
} from "../domain/build-report";

function escapeMarkdown(
  value: string,
): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|");
}

function questionSection(
  heading: string,
  questions:
    readonly AudienceQuestion[],
): string {
  if (questions.length === 0) {
    return `## ${heading}\n\nNone recorded.\n`;
  }

  const lines = questions.map(
    (question) => {
      const evidence = question.evidence
        .map(
          (span) =>
            `> ${escapeMarkdown(
              span.quote,
            )}`,
        )
        .join("\n\n");

      return [
        `### ${escapeMarkdown(
          question.text,
        )}`,
        "",
        `- **Kind:** ${question.kind}`,
        `- **Status:** ${question.status}`,
        `- **Severity:** ${question.severity}`,
        `- **Opened:** Segment ${
          question.openedAtOrdinal + 1
        }`,
        `- **Creator review:** ${
          question.creatorDisposition
        }`,
        "",
        question.rationale,
        "",
        evidence,
        "",
        question.minimalClarification ===
        null
          ? ""
          : `**Minimal clarification to consider:** ${escapeMarkdown(
              question.minimalClarification,
            )}`,
      ]
        .filter((line) => line !== "")
        .join("\n");
    },
  );

  return `## ${heading}\n\n${lines.join(
    "\n\n",
  )}\n`;
}

export function reportToMarkdown(
  report: ReportModel,
): string {
  return [
    `# ${escapeMarkdown(report.title)}`,
    "",
    `Generated: ${report.generatedAt}`,
    `Provider: ${report.providerLabel}`,
    `Model: ${report.modelId ?? "Fixture / none"}`,
    `Script hash: \`${report.scriptHash}\``,
    "",
    "## Summary",
    "",
    report.summary,
    "",
    questionSection(
      "Creator-intended curiosity",
      report.intendedQuestions,
    ),
    questionSection(
      "Accidental questions",
      report.accidentalQuestions,
    ),
    questionSection(
      "Blocking confusion",
      report.blockingConfusions,
    ),
    questionSection(
      "Still unresolved",
      report.unresolvedQuestions,
    ),
    questionSection(
      "Resolved arcs",
      report.resolvedQuestions,
    ),
    "## Limitations",
    "",
    ...report.limitations.map(
      (limitation) => `- ${limitation}`,
    ),
    "",
  ].join("\n");
}