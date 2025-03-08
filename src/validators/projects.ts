import { InferValidators } from "@/lib/types";
import { z } from "zod";

/**
 * Zod validation schema for the auth module
 */
class ProjectValidator {
  createProject = z.object({
    name: z.string(),
    description: z.string(),
  });

  createChat = z.object({
    userPrompt: z.string().optional().nullable().nullish().default(""),
    retry: z
      .object({
        chatId: z.string(),
      })
      .optional()
      .nullable()
      .nullish(),
  });
  trackProject = z.object({
    platform: z.enum(["x", "tiktok", "instagram", "facebook"]),
    url: z.string().optional().nullable().nullish(),
    date: z.string(),
  });
}

export const projectValidator = new ProjectValidator();

export type ProjectValidatorType = InferValidators<typeof projectValidator>;
