import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";

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

async function downloadAndCheck(key: string, outputFile: string) {
  console.log(`\n=== Downloading ${key} ===`);
  
  try {
    const result = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    
    const body = await result.Body?.transformToByteArray();
    if (!body) {
      console.log("❌ No body in response");
      return;
    }
    
    // Save to file
    fs.writeFileSync(outputFile, Buffer.from(body));
    console.log(`✅ Downloaded to ${outputFile}`);
    console.log(`   Size: ${body.length} bytes`);
    
    // Check PNG signature (first 8 bytes should be: 137 80 78 71 13 10 26 10)
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
    const isValidPng = pngSignature.every((byte, i) => body[i] === byte);
    console.log(`   Valid PNG signature: ${isValidPng ? "✅ Yes" : "❌ No"}`);
    
    if (!isValidPng) {
      console.log(`   First 20 bytes: ${Array.from(body.slice(0, 20)).join(", ")}`);
      // Try to decode as text to see if it's an error message
      const asText = Buffer.from(body.slice(0, 500)).toString("utf-8");
      console.log(`   As text: ${asText.substring(0, 200)}`);
    }
    
  } catch (error: any) {
    console.log("❌ Error:", error.message);
  }
}

async function main() {
  // Create temp dir
  const tempDir = path.resolve(process.cwd(), "temp-images");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Download failed image (Jan 30)
  await downloadAndCheck(
    "campaign-chats/67d2ecaa85e21c5b1816c356/697bbc017b677eaff2bf5311/3/instagram/text-card-1769780281084.png",
    path.join(tempDir, "failed-jan30.png")
  );
  
  // Download successful image (Jan 29)
  await downloadAndCheck(
    "campaign-chats/67d2ecaa85e21c5b1816c356/697bbc017b677eaff2bf5311/1/instagram/text-card-1769717812868.png",
    path.join(tempDir, "success-jan29.png")
  );
  
  console.log(`\n✅ Images saved to ${tempDir}`);
  console.log("Open these files to visually inspect them.");
}

main().catch(console.error);
