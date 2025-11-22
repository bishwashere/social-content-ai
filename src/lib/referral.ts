import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a unique referral code
 */
export function generateReferralCode(): string {
  // Generate a random 8-character alphanumeric code
  return randomBytes(4).toString("hex");
}

/**
 * Generate random username and password for super admin
 */
export function generateSuperAdminCredentials(): {
  username: string;
  password: string;
} {
  const username = `admin_${randomBytes(4).toString("hex")}`;
  const password = randomBytes(12).toString("hex");
  return { username, password };
}
