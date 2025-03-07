import { InferValidators } from "@/lib/types";
import { z } from "zod";

/**
 * Zod validation schema for the auth module
 */
class AuthValidator {
  continueWithGoogle = z.object({
    credential: z.string(),
  });
}

export const authValidator = new AuthValidator();

export type AuthValidatorType = InferValidators<typeof authValidator>;
