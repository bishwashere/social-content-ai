/**
 * Test the cron job API locally
 * This script calls the /api/post endpoint to test scheduled post processing
 * 
 * Usage:
 *   pnpm tsx scripts/test-cron-api-local.ts
 */

async function testCronApi() {
  try {
    console.log("🧪 Testing cron job API locally...\n");
    
    // Get the base URL from environment or default to localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const apiUrl = `${baseUrl}/api/post`;
    
    console.log(`📡 Calling: ${apiUrl}\n`);
    
    const startTime = Date.now();
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`);
    
    const data = await response.json();
    
    console.log("=".repeat(80));
    console.log("📋 RESPONSE DATA");
    console.log("=".repeat(80));
    console.log(JSON.stringify(data, null, 2));
    console.log("=".repeat(80));
    
    if (data.status === 200) {
      console.log("\n✅ API call successful!");
      console.log(`   Processed: ${data.data?.processed || 0}`);
      console.log(`   Successful: ${data.data?.successful || 0}`);
      console.log(`   Failed: ${data.data?.failed || 0}`);
      
      if (data.data?.blogNews) {
        console.log(`\n📰 Blog News:`);
        console.log(`   Processed: ${data.data.blogNews.processed || 0}`);
        console.log(`   Successful: ${data.data.blogNews.successful || 0}`);
        console.log(`   Failed: ${data.data.blogNews.failed || 0}`);
      }
      
      if (data.data?.details && data.data.details.length > 0) {
        console.log(`\n📝 Details (first 3):`);
        data.data.details.slice(0, 3).forEach((detail: any, idx: number) => {
          console.log(`   ${idx + 1}. ID: ${detail.id?.substring(0, 12)}..., Success: ${detail.success}, Error: ${detail.error || "None"}`);
        });
      }
    } else {
      console.log("\n❌ API call failed!");
      console.log(`   Error: ${data.message || "Unknown error"}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error testing cron API:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

testCronApi();

