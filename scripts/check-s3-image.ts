import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as fs from "fs";
import * as path from "path";

// Load env vars from .env.local manually
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

async function checkImage(key: string, label: string) {
  console.log(`\n=== ${label} ===`);
  console.log("Key:", key);
  
  try {
    // Check if file exists
    const headResult = await s3.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    
    console.log("✅ File EXISTS in S3");
    console.log("   Content-Type:", headResult.ContentType);
    console.log("   Content-Length:", headResult.ContentLength, "bytes");
    console.log("   Last Modified:", headResult.LastModified);
    
    // Generate signed URL
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: 3600 }
    );
    
    console.log("   Signed URL (1 hour):", signedUrl.substring(0, 100) + "...");
    
    // Check if URL is accessible
    try {
      const response = await fetch(signedUrl, { method: "HEAD" });
      console.log("   URL accessible:", response.ok ? "✅ Yes" : `❌ No (${response.status})`);
    } catch (fetchError) {
      console.log("   URL accessible: ❌ Error fetching URL");
    }
    
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      console.log("❌ File DOES NOT EXIST in S3");
    } else {
      console.log("❌ Error checking file:", error.message);
    }
    return false;
  }
}

async function main() {
  console.log("Bucket:", bucket);
  
  // Failed image (Jan 30)
  await checkImage(
    "campaign-chats/67d2ecaa85e21c5b1816c356/697bbc017b677eaff2bf5311/3/instagram/text-card-1769780281084.png",
    "FAILED POST IMAGE (Jan 30)"
  );
  
  // Successful image (Jan 29)
  await checkImage(
    "campaign-chats/67d2ecaa85e21c5b1816c356/697bbc017b677eaff2bf5311/1/instagram/text-card-1769717812868.png",
    "SUCCESSFUL POST IMAGE (Jan 29)"
  );
}

main().catch(console.error);
