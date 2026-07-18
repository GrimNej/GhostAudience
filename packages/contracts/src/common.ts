import { z } from "zod";

export const IdSchema = z
  .string()
  .trim()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/u);

export const IsoDateTimeSchema = z.iso.datetime({
  offset: true,
});

export const Sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/u);

export const EvidenceSpanSchema = z
  .object({
    segmentId: IdSchema,
    startOffset: z.int().min(0),
    endOffset: z.int().positive(),
    quote: z.string().min(1).max(1_200),
  })
  .strict()
  .refine(
    (value) => value.endOffset > value.startOffset,
    {
      message:
        "endOffset must be greater than startOffset",
      path: ["endOffset"],
    },
  );

export const QuestionKindSchema = z.enum([
  "identity",
  "motivation",
  "causality",
  "timeline",
  "reference",
  "world_rule",
  "knowledge_gap",
  "emotional_reaction",
  "promise_payoff",
  "possible_contradiction",
  "stakes",
  "spatial_relation",
  "other",
]);

export const QuestionSeveritySchema = z.enum([
  "curiosity",
  "clarity_risk",
  "blocking_confusion",
]);

export const ProviderModeSchema = z.enum([
  "watsonx",
  "fixture",
  "disabled",
]);