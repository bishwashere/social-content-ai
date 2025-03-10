import { Platform, PLATFORMS } from "@/lib/prompt";
import { z } from "zod";

/**
 * Zod validation schema used across multiple modules
 */
class CommonValidator {
  availablePlatform = () => {
    return z.string().refine((v) => PLATFORMS.includes(v as Platform));
  };
  optionalString = () => {
    return z.string().optional().nullable().nullish();
  };
}
export const commonValidator = new CommonValidator();
