import { z } from "zod";

export const IamTokenResponseSchema = z
  .object({
    access_token: z.string().min(20),
    refresh_token: z.string().optional(),
    token_type: z.string().min(1),
    expires_in: z.number().int().positive(),
    expiration: z.number().int().positive(),
    scope: z.string().optional(),
  })
  .passthrough();

export const WatsonxChatResponseSchema = z
  .object({
    id: z.string().optional(),
    model_id: z.string().optional(),
    created: z.number().optional(),
    choices: z
      .array(
        z
          .object({
            index: z.number().int().nonnegative(),
            message: z
              .object({
                role: z.string(),
                content: z.string().min(1),
              })
              .passthrough(),
            finish_reason: z.string().nullable().optional(),
          })
          .passthrough(),
      )
      .min(1),
    usage: z
      .object({
        prompt_tokens: z.number().int().nonnegative().optional(),
        completion_tokens: z.number().int().nonnegative().optional(),
        total_tokens: z.number().int().nonnegative().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const WatsonxModelSpecSchema = z
  .object({
    model_id: z.string().min(1),
  })
  .passthrough();

export const WatsonxModelCatalogSchema = z
  .object({
    resources: z.array(WatsonxModelSpecSchema).default([]),
  })
  .passthrough();
