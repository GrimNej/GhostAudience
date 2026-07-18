import { z } from "zod";
import {
  EvidenceSpanSchema,
  IdSchema,
  QuestionKindSchema,
  QuestionSeveritySchema,
  Sha256Schema,
} from "./common.js";

export const CompactAudienceFactSchema = z
  .object({
    id: IdSchema,
    statement: z.string().min(3).max(500),
    confidence: z.enum([
      "explicit",
      "strong_inference",
      "weak_inference",
    ]),
  })
  .strict();

export const CompactAudienceAssumptionSchema = z
  .object({
    id: IdSchema,
    statement: z.string().min(3).max(500),
    strength: z.enum(["low", "medium", "high"]),
    status: z.enum([
      "active",
      "confirmed",
      "refuted",
      "expired",
    ]),
  })
  .strict();

export const ModelQuestionSummarySchema = z
  .object({
    id: IdSchema,
    semanticKey: z.string().min(3).max(240),
    text: z.string().min(5).max(400),
    kind: QuestionKindSchema,
    status: z.enum([
      "open",
      "partially_answered",
      "resolved",
      "contradicted",
      "stale",
    ]),
    severity: QuestionSeveritySchema,
    openedAtOrdinal: z.number().int().nonnegative(),
    lastChangedAtOrdinal: z.number().int().nonnegative(),
  })
  .strict();

export const CompactAudienceStateSchema = z
  .object({
    processedThroughOrdinal: z.number().int().min(-1),
    facts: z.array(CompactAudienceFactSchema).max(120),
    assumptions: z
      .array(CompactAudienceAssumptionSchema)
      .max(80),
    compactNarrativeState: z
      .string()
      .min(1)
      .max(16_000),
  })
  .strict();

export const AnalysisPolicySchema = z
  .object({
    preservePlausibleAmbiguity: z.literal(true),
    avoidAudienceProbabilities: z.literal(true),
    requireEvidence: z.literal(true),
    ignoreExternalStoryKnowledge: z.literal(true),
  })
  .strict();

export const StepAnalysisInputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    requestId: IdSchema,
    idempotencyKey: Sha256Schema,
    runId: IdSchema,
    currentOrdinal: z.number().int().nonnegative(),
    priorPrefixHash: Sha256Schema,
    expectedNextPrefixHash: Sha256Schema,
    currentSegment: z
      .object({
        id: IdSchema,
        heading: z.string().min(1).max(300).nullable(),
        text: z.string().min(1).max(12_000),
        sha256: Sha256Schema,
      })
      .strict(),
    priorAudienceState: CompactAudienceStateSchema,
    activeQuestions: z
      .array(ModelQuestionSummarySchema)
      .max(80),
    analysisPolicy: AnalysisPolicySchema,
    limits: z
      .object({
        maxNewQuestions: z
          .number()
          .int()
          .min(0)
          .max(12),
        maxOperations: z
          .number()
          .int()
          .min(1)
          .max(20),
      })
      .strict(),
  })
  .strict();

const OpenQuestionOperationSchema = z
  .object({
    operationId: IdSchema,
    type: z.literal("open"),
    semanticKey: z.string().min(3).max(240),
    text: z.string().min(5).max(400),
    kind: QuestionKindSchema,
    severity: QuestionSeveritySchema,
    evidence: z.array(EvidenceSpanSchema).min(1).max(3),
    rationale: z.string().min(10).max(800),
    minimalClarification: z
      .string()
      .min(3)
      .max(500)
      .nullable(),
  })
  .strict();

const ExistingQuestionOperationSchema = z
  .object({
    operationId: IdSchema,
    type: z.enum([
      "reinforce",
      "partial_answer",
      "resolve",
      "contradict",
      "mark_stale",
      "reopen",
    ]),
    questionId: IdSchema,
    evidence: z.array(EvidenceSpanSchema).max(3),
    rationale: z.string().min(10).max(800),
  })
  .strict();

export const QuestionOperationSchema =
  z.discriminatedUnion("type", [
    OpenQuestionOperationSchema,
    ExistingQuestionOperationSchema,
  ]);

export const StepAnalysisOutputSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    requestId: IdSchema,
    factsAdded: z
      .array(
        z
          .object({
            id: IdSchema,
            statement: z.string().min(3).max(500),
            confidence: z.enum([
              "explicit",
              "strong_inference",
              "weak_inference",
            ]),
            evidence: z
              .array(EvidenceSpanSchema)
              .min(1)
              .max(3),
          })
          .strict(),
      )
      .max(20),
    assumptionsAdded: z
      .array(
        z
          .object({
            id: IdSchema,
            statement: z.string().min(3).max(500),
            strength: z.enum(["low", "medium", "high"]),
            evidence: z
              .array(EvidenceSpanSchema)
              .min(1)
              .max(3),
          })
          .strict(),
      )
      .max(20),
    assumptionUpdates: z
      .array(
        z
          .object({
            id: IdSchema,
            status: z.enum([
              "confirmed",
              "refuted",
              "expired",
            ]),
            evidence: z.array(EvidenceSpanSchema).max(3),
            rationale: z.string().min(5).max(500),
          })
          .strict(),
      )
      .max(20),
    questionOperations: z
      .array(QuestionOperationSchema)
      .max(20),
    warnings: z
      .array(z.string().min(1).max(300))
      .max(10),
  })
  .strict();

export type StepAnalysisInput = z.infer<
  typeof StepAnalysisInputSchema
>;
export type StepAnalysisOutput = z.infer<
  typeof StepAnalysisOutputSchema
>;
export type QuestionOperation = z.infer<
  typeof QuestionOperationSchema
>;