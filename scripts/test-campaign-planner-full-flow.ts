/**
 * Test the full flow - simulates what happens when you visit/switch to a project
 * This tests the exact same flow as React Query hook + server action
 * 
 * Usage:
 *   npx tsx scripts/test-campaign-planner-full-flow.ts <projectId>
 * 
 * Example:
 *   npx tsx scripts/test-campaign-planner-full-flow.ts 6962e3a5bb1684876a59b516
 */

import { getCampaignPlannerMetadata } from "../src/backend-apis/campaign-planner/index";

async function simulateProjectSwitch(projectId: string) {
  console.log("=".repeat(80));
  console.log("🧪 SIMULATING PROJECT SWITCH FLOW");
  console.log("=".repeat(80));
  console.log(`\n📍 URL: http://localhost:3000/project/${projectId}?tab=campaign\n`);
  
  // Step 1: Simulate what useGetCampaignPlanner hook does
  console.log("Step 1: React Query hook calls getCampaignPlannerMetadata...");
  console.log(`   - projectId: ${projectId}`);
  console.log(`   - loadChats: false`);
  console.log(`   - limit: 3`);
  console.log("");
  
  const startTime = Date.now();
  
  try {
    // Step 2: Call the server action (exactly as React Query does)
    console.log("Step 2: Calling server action getCampaignPlannerMetadata...");
    const result = await getCampaignPlannerMetadata(projectId, 3);
    
    const duration = Date.now() - startTime;
    
    // Step 3: Simulate what React Query does with the result
    console.log("Step 3: Server action returned, React Query processes result...");
    console.log(`   ✅ Duration: ${duration}ms`);
    console.log(`   ✅ Status: success`);
    console.log(`   ✅ Data received: ${result.chatsGroupedByCampaign.length} campaign(s)\n`);
    
    // Step 4: Show what the component receives
    console.log("=".repeat(80));
    console.log("Step 4: Component receives data (campaignPlannerData.data)");
    console.log("=".repeat(80));
    
    if (result.chatsGroupedByCampaign.length === 0) {
      console.log("\n📭 Empty state - No campaigns found");
      console.log("   The page will show: 'No campaigns yet' or empty campaign list\n");
    } else {
      console.log("\n📋 Campaigns that will be displayed on the page:\n");
      result.chatsGroupedByCampaign.forEach((campaign, index) => {
        console.log(`${index + 1}. ${campaign.name || 'Unnamed Campaign'}`);
        console.log(`   ├─ ID: ${campaign.id}`);
        console.log(`   ├─ Goal: ${campaign.goal}`);
        console.log(`   ├─ Target Audience: ${campaign.targetAudience}`);
        console.log(`   ├─ Platforms: ${campaign.platforms.join(', ') || 'None'}`);
        console.log(`   ├─ Start Date: ${campaign.startDate ? new Date(campaign.startDate).toLocaleString() : 'Not set'}`);
        console.log(`   ├─ Auto Post: ${campaign.autoPostEnabled ? `Yes (${campaign.autoPostTime})` : 'No'}`);
        console.log(`   └─ Chats: ${campaign.chats.length} (will load on demand when opened)\n`);
      });
    }
    
    // Step 5: Show the exact data structure
    console.log("=".repeat(80));
    console.log("Step 5: Exact data structure returned (what React Query stores)");
    console.log("=".repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(80));
    
    // Step 6: Performance check
    console.log("\n📊 Performance Analysis:");
    if (duration < 200) {
      console.log(`   ✅ Excellent (< 200ms)`);
    } else if (duration < 500) {
      console.log(`   ✅ Good (< 500ms)`);
    } else if (duration < 1000) {
      console.log(`   ⚠️  Acceptable (< 1s)`);
    } else if (duration < 2000) {
      console.log(`   ⚠️  Slow (< 2s) - might cause user to notice delay`);
    } else {
      console.log(`   ❌ Very Slow (> 2s) - user will definitely notice`);
    }
    
    console.log("\n✅ FULL FLOW TEST PASSED");
    console.log("   The function works correctly and returns data in the expected format");
    console.log("   This is exactly what happens when you switch projects\n");
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log("=".repeat(80));
    console.log("❌ ERROR IN FLOW");
    console.log("=".repeat(80));
    console.log(`⏱️  Duration before error: ${duration}ms\n`);
    
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.stack) {
        console.error(`\n📚 Stack trace:`);
        console.error(error.stack);
      }
    } else {
      console.error(`❌ Unknown error:`, error);
    }
    
    console.log("\n❌ FULL FLOW TEST FAILED");
    console.log("   This means the page will not load campaigns correctly\n");
    
    throw error;
  }
}

// Get projectId from command line arguments
const projectId = process.argv[2];

if (!projectId) {
  console.error("❌ Error: Project ID is required");
  console.error("\nUsage:");
  console.error("  npx tsx scripts/test-campaign-planner-full-flow.ts <projectId>");
  console.error("\nExample:");
  console.error("  npx tsx scripts/test-campaign-planner-full-flow.ts 6962e3a5bb1684876a59b516");
  process.exit(1);
}

// Validate projectId format
if (projectId.length < 20) {
  console.error("❌ Error: Project ID appears to be invalid (too short)");
  process.exit(1);
}

simulateProjectSwitch(projectId);
