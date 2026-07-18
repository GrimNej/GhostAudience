import { z } from "zod";

import { IntentContractSchema } from "../domain/intent";
import { QuestionSummarySchema } from "../domain/question-summary";

export const FinalizeRunInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    requestId: z.string().min(8).max(80),
    scriptHash: z.string().regex(/^[a-f0-9]{64}$/u),
    projectTitle: z.string().min(1).max(200),
    intentContract: IntentContractSchema,
    metrics: z
      .object({
        segmentCount: z.number().int().nonnegative(),
        questionCount: z.number().int().nonnegative(),
        openCount: z.number().int().nonnegative(),
        resolvedCount: z.number().int().nonnegative(),
        blockingCount: z.number().int().nonnegative(),
      })
      .strict(),
    questions: z.array(QuestionSummarySchema).max(300),
  })
  .strict();

export type FinalizeRunInput = z.infer<typeof FinalizeRunInputSchema>;

const SummaryFindingSchema = z
  .object({
    questionId: z.string().min(1),
    summary: z.string().min(5).max(600),
  })
  .strict();

export const FinalizeRunOutputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    requestId: z.string().min(8).max(80),
    executiveSummary: z.string().min(20).max(2_000),
    strongestCuriosityArcs: z.array(SummaryFindingSchema).max(10),
    blockingConfusions: z.array(SummaryFindingSchema).max(10),
    lateResolutions: z.array(SummaryFindingSchema).max(10),
    abandonedPromises: z.array(SummaryFindingSchema).max(10),
    intentAlignment: z.array(z.string().min(5).max(600)).max(10),
    limitations: z.array(z.string().min(5).max(600)).min(1).max(10),
  })
  .strict();

export type FinalizeRunOutput = z.infer<typeof FinalizeRunOutputSchema>;
