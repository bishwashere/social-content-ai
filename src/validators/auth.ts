import { InferValidators } from "@/lib/types";
import { z } from "zod";

/**
 * Zod validation schema for the auth module
 */
class AuthValidator {
  continueWithGoogle = z.object({
    credential: z.string(),
  });
  emailLogin = z.object({
    email: z.email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });
}

export const authValidator = new AuthValidator();

export type AuthValidatorType = InferValidators<typeof authValidator>;
