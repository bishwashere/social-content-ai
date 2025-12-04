import { randomBytes } from "crypto";

function generateIdeasAdminCredentials(): {
  username: string;
  password: string;
} {
  const username = `ideas_admin_${randomBytes(4).toString("hex")}`;
  const password = randomBytes(12).toString("hex");
  return { username, password };
}

/**
 * Script to generate ideas admin credentials
 * Run with: npx tsx scripts/generate-ideas-admin-credentials.ts
 */
function main() {
  const { username, password } = generateIdeasAdminCredentials();

  console.log("\n==========================================");
  console.log("Ideas Admin Credentials Generated");
  console.log("==========================================\n");
  console.log("Add these to your .env file:\n");
  console.log(`IDEAS_ADMIN_USERNAME=${username}`);
  console.log(`IDEAS_ADMIN_PASSWORD=${password}\n`);
  console.log("==========================================\n");
  console.log("⚠️  IMPORTANT: Save these credentials securely!");
  console.log("⚠️  Do not commit them to version control!\n");
}

main();
