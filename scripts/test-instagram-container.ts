import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

const s3 = new S3Client({
  region: "auto",
  endpoint: envVars.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: envVars.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: envVars.CLOUDFLARE_R2_SECRET_KEY,
  },
});

const bucket = envVars.CLOUDFLARE_R2_BUCKET;
const prisma = new PrismaClient();

// Copy the actual decryptToken logic
function decryptToken(encryptedToken: string): string {
  if (!encryptedToken) {
    return '';
  }

  const key = envVars.ENCRYPTION_KEY;
  if (!key) {
    console.log("⚠️ ENCRYPTION_KEY not set, returning token as-is");
    return encryptedToken;
  }

  // Check if it looks encrypted (has : separator)
  const parts = encryptedToken.split(':');
  if (parts.length !== 2) {
    console.log("⚠️ Token doesn't have iv:data format, might be plain");
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
    console.error("❌ Decryption error:", error.message);
    return encryptedToken;
  }
}

async function main() {
  const failedPostId = "697cb8fde4d5113cc245f600";
  
  // Get the failed post
  const post = await prisma.scheduledPost.findUnique({
    where: { id: failedPostId },
    include: {
      project: {
        include: {
          projectToOAuthProviders: {
            include: {
              oauthProvider: true,
            },
          },
        },
      },
    },
  });

  if (!post) {
    console.log("❌ Post not found");
    return;
  }

  // Get Instagram OAuth provider
  const oauthProvider = post.project?.projectToOAuthProviders.find(
    (p) => p.oauthProvider?.platform === "instagram"
  )?.oauthProvider;

  if (!oauthProvider) {
    console.log("❌ No Instagram OAuth provider found");
    return;
  }

  console.log("=== TESTING INSTAGRAM CONTAINER CREATION ===\n");
  
  // Check the raw token format
  console.log("0. Token Analysis:");
  console.log("   Raw token length:", oauthProvider.accessToken.length);
  console.log("   Has colon separator:", oauthProvider.accessToken.includes(":"));
  console.log("   Raw token (first 50):", oauthProvider.accessToken.substring(0, 50) + "...");
  
  // Step 1: Generate signed URL
  console.log("\n1. Generating signed URL for media...");
  const mediaKey = post.media!;
  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: mediaKey,
    }),
    { expiresIn: 3600 }
  );
  console.log("   Media key:", mediaKey);
  console.log("   Signed URL:", signedUrl.substring(0, 80) + "...");
  
  // Step 2: Decrypt and prepare API call
  const accessToken = decryptToken(oauthProvider.accessToken);
  const igUserId = oauthProvider.pageId;
  const isStandalone = oauthProvider.isStandalone ?? false;
  
  // OVERRIDE: Test with the correct endpoint based on token type
  const tokenType = accessToken.startsWith("IGA") ? "instagram-standalone" : 
                   accessToken.startsWith("EAA") ? "facebook-linked" : "unknown";
  const shouldBeStandalone = tokenType === "instagram-standalone";
  
  // Use the CORRECT endpoint based on token type, not the database value
  const baseUrl = shouldBeStandalone 
    ? "https://graph.instagram.com/v23.0"
    : "https://graph.facebook.com/v23.0";
    
  console.log("\n   TOKEN TYPE ANALYSIS:");
  console.log("   Token type detected:", tokenType);
  console.log("   isStandalone in DB:", isStandalone);
  console.log("   Should be standalone:", shouldBeStandalone);
  console.log("   MISMATCH:", isStandalone !== shouldBeStandalone ? "⚠️ YES - THIS IS THE BUG!" : "No");

  console.log("\n2. Instagram API Details:");
  console.log("   igUserId:", igUserId);
  console.log("   isStandalone:", isStandalone);
  console.log("   Base URL:", baseUrl);
  console.log("   Decrypted token starts with:", accessToken.substring(0, 10) + "...");
  console.log("   Token looks valid (EAA/IGA):", accessToken.startsWith("EAA") || accessToken.startsWith("IGA"));
  
  // Step 3: Make the container creation API call
  console.log("\n3. Creating Instagram container...");
  const apiUrl = `${baseUrl}/${igUserId}/media`;
  const params = new URLSearchParams({
    image_url: signedUrl,
    caption: "Test caption from debug script",
    access_token: accessToken,
  });
  
  console.log("   API URL:", apiUrl);
  console.log("   Request: POST with image_url and caption");
  
  try {
    const response = await fetch(`${apiUrl}?${params.toString()}`, {
      method: "POST",
    });
    
    const data = await response.json();
    console.log("\n4. API Response:");
    console.log("   Status:", response.status, response.statusText);
    console.log("   Body:", JSON.stringify(data, null, 2));
    
    if (data.id) {
      console.log("\n✅ Container created successfully! ID:", data.id);
      console.log("\n⚠️ NOTE: A container was created. You may want to delete it from Instagram.");
    } else {
      console.log("\n❌ Container creation FAILED");
      if (data.error) {
        console.log("   Error message:", data.error.message);
        console.log("   Error type:", data.error.type);
        console.log("   Error code:", data.error.code);
        console.log("   Error subcode:", data.error.error_subcode);
      }
    }
  } catch (error: any) {
    console.log("\n❌ Network error:", error.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
