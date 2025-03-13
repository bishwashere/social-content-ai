import { InferValidators } from "@/lib/types";
import { z } from "zod";

/**
 * Zod validation schema for the wall module
 */
class WallValidator {
  post = z.object({
    prompt: z.string(),
    content: z.string(),
    platform: z.string(),
    projectId: z.string(),
  });
}

export const wallValidator = new WallValidator();

export type wallValidatorType = InferValidators<typeof wallValidator>;
