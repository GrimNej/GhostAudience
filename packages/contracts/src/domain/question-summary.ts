import { z } from "zod";

const QuestionStatusSchema = z.enum([
  "open",
  "partially_answered",
  "resolved",
  "contradicted",
  "stale",
]);

const QuestionSeveritySchema = z.enum([
  "curiosity",
  "clarity_risk",
  "blocking_confusion",
]);

const CreatorDispositionSchema = z.enum([
  "unreviewed",
  "intended",
  "acceptable",
  "accidental",
  "incorrect_ai_interpretation",
]);

export const QuestionSummarySchema = z
  .object({
    id: z.string().min(1).max(120),
    semanticKey:
      z.string().min(3).max(240),
    text: z.string().min(5).max(400),
    kind: z.string().min(1).max(80),
    status: QuestionStatusSchema,
    severity: QuestionSeveritySchema,
    creatorDisposition:
      CreatorDispositionSchema,
    openedAtOrdinal:
      z.number().int().nonnegative(),
    lastChangedAtOrdinal:
      z.number().int().nonnegative(),
    resolvedAtOrdinal:
      z.number().int().nonnegative().nullable(),
    rationale:
      z.string().min(5).max(800),
  })
  .strict();

export type QuestionSummary =
  z.infer<typeof QuestionSummarySchema>;