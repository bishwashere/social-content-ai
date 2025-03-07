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
    userPrompt: z.string().min(1),
    retry: z
      .object({
        chatId: z.string(),
      })
      .optional()
      .nullable()
      .nullish(),
  });
}

export const projectValidator = new ProjectValidator();

export type ProjectValidatorType = InferValidators<typeof projectValidator>;
