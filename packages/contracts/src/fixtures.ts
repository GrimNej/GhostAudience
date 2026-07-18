import { z } from "zod";
import { IsoDateTimeSchema, Sha256Schema } from "./common.js";
import { StepAnalysisOutputSchema } from "./step-analysis.js";

export const FixtureManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    fixtureId: z.string().min(8).max(128),
    mode: z.literal("fixture"),
    inputSha256: Sha256Schema,
    responseSha256: Sha256Schema,
    promptVersion: z.string().min(1).max(100),
    modelId: z.string().min(1).max(200),
    generatedAt: IsoDateTimeSchema,
    reviewedBy: z.string().min(2).max(200),
    validationPassed: z.literal(true),
  })
  .strict();

export const FixtureResponseSchema = StepAnalysisOutputSchema;
