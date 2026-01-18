/**
 * Test project switching - simulates the exact user behavior
 * From: http://localhost:3000/project/6962e39ebb1684876a59b513?tab=campaign
 * To:   http://localhost:3000/project/6962e3a5bb1684876a59b516?tab=campaign
 * 
 * Usage:
 *   npx tsx scripts/test-project-switch.ts
 */

import { getCampaignPlannerMetadata } from "../src/backend-apis/campaign-planner/index";

async function simulateProjectSwitch() {
  const fromProjectId = '6962e39ebb1684876a59b513';
  const toProjectId = '6962e3a5bb1684876a59b516';
  
  console.log("=".repeat(80));
  console.log("🧪 SIMULATING PROJECT SWITCH (User Behavior)");
  console.log("=".repeat(80));
  console.log(`\n📍 FROM: http://localhost:3000/project/${fromProjectId}?tab=campaign`);
  console.log(`📍 TO:   http://localhost:3000/project/${toProjectId}?tab=campaign\n`);
  
  // Step 1: User is on project A
  console.log("=".repeat(80));
  console.log("STEP 1: User is on Project A");
  console.log("=".repeat(80));
  console.log("   - React Query has active query for project A");
  console.log("   - Component is rendering with project A data\n");
  
  const step1Start = Date.now();
  console.log("   ⏳ Fetching data for Project A...");
  const projectAData = await getCampaignPlannerMetadata(fromProjectId, 3);
  const step1Duration = Date.now() - step1Start;
  console.log(`   ✅ Project A data loaded in ${step1Duration}ms`);
  console.log(`   📊 Campaigns: ${projectAData.chatsGroupedByCampaign.length}\n`);
  
  // Step 2: User clicks to switch to project B
  console.log("=".repeat(80));
  console.log("STEP 2: User clicks to switch to Project B");
  console.log("=".repeat(80));
  console.log("   - React Query should cancel Project A query");
  console.log("   - React Query should clear Project A cache");
  console.log("   - Component state should be cleared");
  console.log("   - New query for Project B should start\n");
  
  // Simulate the cleanup that happens in useEffect
  console.log("   🔄 Simulating cleanup (what useEffect does):");
  console.log("      - queryClient.cancelQueries({ queryKey: ['campaignPlanner'] })");
  console.log("      - queryClient.removeQueries({ queryKey: ['campaignPlanner'] })");
  console.log("      - setLoadedChats({})");
  console.log("      - setOpenCampaigns({})\n");
  
  // Small delay to simulate the switch
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Step 3: New query for project B starts
  console.log("=".repeat(80));
  console.log("STEP 3: New query for Project B starts");
  console.log("=".repeat(80));
  console.log("   - React Query calls: getCampaignPlannerMetadata(projectB, 3)");
  console.log("   - This is where the hanging might occur\n");
  
  const step3Start = Date.now();
  console.log("   ⏳ Fetching data for Project B...");
  
  try {
    const projectBData = await Promise.race([
      getCampaignPlannerMetadata(toProjectId, 3),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT: Query took longer than 5 seconds")), 5000)
      )
    ]) as Awaited<ReturnType<typeof getCampaignPlannerMetadata>>;
    
    const step3Duration = Date.now() - step3Start;
    
    console.log(`   ✅ Project B data loaded in ${step3Duration}ms`);
    console.log(`   📊 Campaigns: ${projectBData.chatsGroupedByCampaign.length}\n`);
    
    // Step 4: Show results
    console.log("=".repeat(80));
    console.log("STEP 4: Results");
    console.log("=".repeat(80));
    console.log(`\nProject A (${fromProjectId}):`);
    console.log(`   Duration: ${step1Duration}ms`);
    console.log(`   Campaigns: ${projectAData.chatsGroupedByCampaign.length}`);
    if (projectAData.chatsGroupedByCampaign.length > 0) {
      console.log(`   Names: ${projectAData.chatsGroupedByCampaign.map(c => c.name).join(', ')}`);
    }
    
    console.log(`\nProject B (${toProjectId}):`);
    console.log(`   Duration: ${step3Duration}ms`);
    console.log(`   Campaigns: ${projectBData.chatsGroupedByCampaign.length}`);
    if (projectBData.chatsGroupedByCampaign.length > 0) {
      console.log(`   Names: ${projectBData.chatsGroupedByCampaign.map(c => c.name).join(', ')}`);
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ PROJECT SWITCH TEST PASSED");
    console.log("=".repeat(80));
    console.log("\nBoth queries completed successfully.");
    console.log("If this works but the page hangs, the issue is in:");
    console.log("  - React Query client-side integration");
    console.log("  - Server action invocation from client");
    console.log("  - Component state management\n");
    
    // Show the data that Project B receives
    console.log("=".repeat(80));
    console.log("📦 Data received by Project B (what component sees):");
    console.log("=".repeat(80));
    console.log(JSON.stringify(projectBData, null, 2));
    console.log("=".repeat(80));
    
  } catch (error) {
    const step3Duration = Date.now() - step3Start;
    
    console.log("=".repeat(80));
    console.log("❌ PROJECT SWITCH TEST FAILED");
    console.log("=".repeat(80));
    console.log(`⏱️  Duration before error: ${step3Duration}ms\n`);
    
    if (error instanceof Error) {
      if (error.message.includes("TIMEOUT")) {
        console.error("❌ TIMEOUT: Project B query took longer than 5 seconds");
        console.error("   This indicates the query is hanging!");
        console.error("   The server function might be stuck or not responding.\n");
      } else {
        console.error(`❌ Error: ${error.message}`);
        if (error.stack) {
          console.error(`\n📚 Stack trace:`);
          console.error(error.stack);
        }
      }
    } else {
      console.error(`❌ Unknown error:`, error);
    }
    
    console.log("\n❌ This confirms the issue - the query hangs when switching projects\n");
    throw error;
  }
}

simulateProjectSwitch().catch(console.error);
