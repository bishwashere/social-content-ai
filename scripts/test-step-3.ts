/**
 * Test script to call Step 3 API and measure performance
 * 
 * Usage:
 *   npx tsx scripts/test-step-3.ts <postId>
 * 
 * Example:
 *   npx tsx scripts/test-step-3.ts 6935d4fa5540347f44055847
 */

async function testStep3(postId: string) {
  const startTime = Date.now();
  
  console.log(`\n🧪 Testing Step 3 API for post: ${postId}\n`);
  console.log(`📍 URL: http://localhost:3000/api/blog/step-3-send-webhook\n`);

  try {
    const response = await fetch("http://localhost:3000/api/blog/step-3-send-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Called-By": "test-script",
      },
      body: JSON.stringify({ postId }),
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`⏱️  Total Duration: ${duration}s\n`);
    console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`);

    const data = await response.json();
    console.log(`📦 Response Body:`);
    console.log(JSON.stringify(data, null, 2));
    console.log("");

    if (!response.ok) {
      console.error(`❌ Step 3 failed with status ${response.status}`);
      process.exit(1);
    } else {
      console.log(`✅ Step 3 completed successfully in ${duration}s\n`);
    }
  } catch (error) {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.error(`\n❌ Error testing Step 3 (after ${duration}s):`);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    } else {
      console.error(`   Error:`, error);
    }
    console.log("");
    process.exit(1);
  }
}

// Get postId from command line arguments
const postId = process.argv[2];

if (!postId) {
  console.error("\n❌ Error: Post ID is required");
  console.error("Usage: npx tsx scripts/test-step-3.ts <postId>\n");
  process.exit(1);
}

testStep3(postId);
