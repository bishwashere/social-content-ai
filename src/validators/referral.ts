import { InferValidators } from "@/lib/types";
import { z } from "zod";

/**
 * Zod validation schema for the referral module
 */
class ReferralValidator {
  superAdminLogin = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  });

  partnerLogin = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
  });

  createPartner = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
  });

  updatePartner = z.object({
    name: z.string().min(1, "Name is required").optional(),
    email: z.string().email("Invalid email address").optional(),
    username: z.string().min(1, "Username is required").optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
  });
}

export const referralValidator = new ReferralValidator();

export type ReferralValidatorType = InferValidators<typeof referralValidator>;
