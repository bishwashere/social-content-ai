import { randomBytes } from "crypto";

function generateSuperAdminCredentials(): {
  username: string;
  password: string;
} {
  const username = `admin_${randomBytes(4).toString("hex")}`;
  const password = randomBytes(12).toString("hex");
  return { username, password };
}

/**
 * Script to generate super admin credentials for the referral system
 * Run with: npx tsx scripts/generate-super-admin-credentials.ts
 */
function main() {
  const { username, password } = generateSuperAdminCredentials();

  console.log("\n==========================================");
  console.log("Super Admin Credentials Generated");
  console.log("==========================================\n");
  console.log("Add these to your .env file:\n");
  console.log(`REFERRAL_SUPER_ADMIN_USERNAME=${username}`);
  console.log(`REFERRAL_SUPER_ADMIN_PASSWORD=${password}\n`);
  console.log("==========================================\n");
  console.log("⚠️  IMPORTANT: Save these credentials securely!");
  console.log("⚠️  Do not commit them to version control!\n");
}

main();
