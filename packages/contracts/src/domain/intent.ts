import { z } from "zod";

const NullableOrdinalSchema = z.number().int().nonnegative().nullable();

export const IntentContractSchema = z
  .object({
    requiredKnowledge: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            statement: z.string().min(3).max(500),
            targetOrdinal: NullableOrdinalSchema,
          })
          .strict(),
      )
      .max(30),
    desiredQuestions: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            question: z.string().min(5).max(500),
            openByOrdinal: NullableOrdinalSchema,
            resolveByOrdinal: NullableOrdinalSchema,
          })
          .strict(),
      )
      .max(30),
    forbiddenAssumptions: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            assumption: z.string().min(3).max(500),
            prohibitedThroughOrdinal: NullableOrdinalSchema,
          })
          .strict(),
      )
      .max(30),
    intentionalMysteries: z.array(z.string().min(3).max(500)).max(30),
    intendedEmotionalDirection: z.string().min(3).max(1_000).nullable(),
    desiredUnresolvedQuestions: z.array(z.string().min(5).max(500)).max(30),
  })
  .strict();

export type IntentContractWire = z.infer<typeof IntentContractSchema>;
