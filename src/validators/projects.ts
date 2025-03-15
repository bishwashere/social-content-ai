import { InferValidators } from "@/lib/types";
import { z } from "zod";
import { commonValidator } from "./common";

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
    options: z
      .object({
        style: z.string(),
        tone: z.string(),
        verb: z.string(),
        goal: z.string(),
        theme: z.string(),
      })
      .optional()
      .nullable()
      .nullish(),

    projectId: z.string().optional().nullable().nullish(),
    projectName: z.string().optional().nullable().nullish(),
    projectDescription: z.string().optional().nullable().nullish(),
  });
  trackProject = z.object({
    platform: commonValidator.availablePlatform(),
    url: z.string().url(),
    date: z.string(),
  });

  updateProject = this.createProject.partial().extend({
    platformUrls: z.record(
      commonValidator.availablePlatform(),
      commonValidator.optionalString()
    ),
  });

  inviteUser = z.object({
    email: z.string().email(),
    role: commonValidator.invitedUserRole(),
  });
}

export const projectValidator = new ProjectValidator();

export type ProjectValidatorType = InferValidators<typeof projectValidator>;
