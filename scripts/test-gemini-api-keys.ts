import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load environment variables from .env file
try {
  const envPath = resolve(process.cwd(), ".env");
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn("⚠️  Could not load .env file, using process.env directly");
}

/**
 * Test all Gemini API keys with a simple prompt
 */
async function testApiKeys() {
  const apiKeys = [
    { name: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY || "" },
    { name: "GEMINI_API_KEY_1", key: process.env.GEMINI_API_KEY_1 || "" },
    { name: "GEMINI_API_KEY_2", key: process.env.GEMINI_API_KEY_2 || "" },
  ];

  console.log("🔑 Testing Gemini API Keys...\n");

  const testPrompt = "Say 'Hello, this is a test' in JSON format: {\"message\": \"your response here\"}";

  for (const { name, key } of apiKeys) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${name}`);
    console.log(`Key present: ${key ? "✅ Yes" : "❌ No"}`);
    console.log(`Key length: ${key.length} characters`);
    console.log(`Key preview: ${key.substring(0, 10)}...${key.substring(key.length - 4)}`);
    console.log(`${"=".repeat(60)}\n`);

    if (!key || key.trim() === "") {
      console.log(`❌ ${name} is not set or is empty\n`);
      continue;
    }

    try {
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash-001" });

      console.log(`📤 Sending test prompt...`);
      const startTime = Date.now();
      
      const result = await model.generateContent(testPrompt);
      const response = await result.response;
      const responseText = response.text().trim();
      const duration = Date.now() - startTime;

      console.log(`✅ SUCCESS!`);
      console.log(`   Response time: ${duration}ms`);
      console.log(`   Response length: ${responseText.length} characters`);
      console.log(`   Response preview: ${responseText.substring(0, 200)}...\n`);

      // Try to parse as JSON
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log(`   ✅ Valid JSON response:`, parsed);
        }
      } catch (e) {
        console.log(`   ⚠️  Response is not valid JSON (this is okay for testing)`);
      }

    } catch (error: any) {
      console.log(`❌ FAILED!`);
      
      const errorDetails: any = {
        message: error?.message || "Unknown error",
        status: error?.status || error?.response?.status || "N/A",
        statusText: error?.statusText || error?.response?.statusText || "N/A",
        code: error?.code || "N/A",
      };

      // Check for specific error types
      if (errorDetails.status === 429) {
        console.log(`   ⚠️  Rate limit exceeded (429)`);
      } else if (errorDetails.status === 401) {
        console.log(`   ❌ Unauthorized - Invalid API key (401)`);
      } else if (errorDetails.status === 403) {
        console.log(`   ❌ Forbidden - API key may not have access (403)`);
      } else if (errorDetails.status === 400) {
        console.log(`   ⚠️  Bad request (400)`);
      } else if (errorDetails.status === 503) {
        console.log(`   ⚠️  Service unavailable (503)`);
      }

      console.log(`   Error details:`, errorDetails);
      console.log(`   Full error:`, error);
      console.log();
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ Testing complete!");
  console.log(`${"=".repeat(60)}\n`);
}

// Run the test
testApiKeys()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

