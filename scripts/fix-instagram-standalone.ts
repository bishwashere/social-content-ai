import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Load env vars from .env manually
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
});

const prisma = new PrismaClient();

// Copy the actual decryptToken logic
function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) {
    return '';
  }

  const key = envVars.ENCRYPTION_KEY;
  if (!key) {
    return encryptedToken;
  }

  const parts = encryptedToken.split(':');
  if (parts.length !== 2) {
    return encryptedToken;
  }

  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedData = parts[1];
    const keyBuffer = Buffer.from(key, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error: any) {
    return encryptedToken;
  }
}

async function main() {
  console.log("=== FIXING INSTAGRAM isStandalone VALUES ===\n");
  
  // Find all Instagram OAuth providers
  const instagramProviders = await prisma.oauthProvider.findMany({
    where: {
      platform: "instagram",
    },
  });

  console.log(`Found ${instagramProviders.length} Instagram OAuth providers\n`);

  let fixedCount = 0;

  for (const provider of instagramProviders) {
    const decryptedToken = decryptToken(provider.accessToken);
    const tokenType = decryptedToken.startsWith("IGA") ? "instagram-standalone" : 
                     decryptedToken.startsWith("EAA") ? "facebook-linked" : "unknown";
    const shouldBeStandalone = tokenType === "instagram-standalone";
    const needsFix = provider.isStandalone !== shouldBeStandalone;

    console.log(`Provider: ${provider.id}`);
    console.log(`  Page Name: ${provider.pageName}`);
    console.log(`  Token type: ${tokenType}`);
    console.log(`  Current isStandalone: ${provider.isStandalone}`);
    console.log(`  Should be: ${shouldBeStandalone}`);
    console.log(`  Needs fix: ${needsFix ? "⚠️ YES" : "No"}`);

    if (needsFix) {
      await prisma.oauthProvider.update({
        where: { id: provider.id },
        data: { isStandalone: shouldBeStandalone },
      });
      console.log(`  ✅ FIXED: Updated isStandalone to ${shouldBeStandalone}`);
      fixedCount++;
    }
    
    console.log();
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total providers: ${instagramProviders.length}`);
  console.log(`Fixed: ${fixedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
