/**
 * Test calling the server action the exact way React Query does from the client
 * This simulates what happens when the browser calls the server action
 * 
 * Usage:
 *   npx tsx scripts/test-server-action-call.ts
 */

// Import the server action directly (this is what React Query does)
import { getCampaignPlannerMetadata } from "../src/backend-apis/campaign-planner/index";

async function testServerActionCall() {
  const fromProjectId = '6962e39ebb1684876a59b513';
  const toProjectId = '6962e3a5bb1684876a59b516';
  
  console.log("=".repeat(80));
  console.log("🧪 TESTING SERVER ACTION CALL (Like React Query Does)");
  console.log("=".repeat(80));
  console.log(`\n📍 FROM: Project ${fromProjectId}`);
  console.log(`📍 TO:   Project ${toProjectId}\n`);
  
  // Step 1: Call for Project A (simulating user on that project)
  console.log("=".repeat(80));
  console.log("STEP 1: Calling server action for Project A");
  console.log("=".repeat(80));
  console.log("   This is what happens when:");
  console.log("   - User is on project A");
  console.log("   - React Query hook: useGetCampaignPlanner({ projectId: A, loadChats: false, limit: 3 })");
  console.log("   - React Query calls: await getCampaignPlannerMetadata(A, 3)\n");
  
  const step1Start = Date.now();
  let projectAData;
  
  try {
    projectAData = await getCampaignPlannerMetadata(fromProjectId, 3);
    const step1Duration = Date.now() - step1Start;
    console.log(`   ✅ Project A completed in ${step1Duration}ms`);
    console.log(`   📊 Campaigns: ${projectAData.chatsGroupedByCampaign.length}\n`);
  } catch (error) {
    console.error(`   ❌ Project A failed:`, error);
    throw error;
  }
  
  // Step 2: Simulate project switch - call for Project B immediately
  console.log("=".repeat(80));
  console.log("STEP 2: User switches to Project B - calling server action immediately");
  console.log("=".repeat(80));
  console.log("   This is what happens when:");
  console.log("   - User clicks to switch projects");
  console.log("   - useEffect runs: cancelQueries, removeQueries");
  console.log("   - React Query hook: useGetCampaignPlanner({ projectId: B, loadChats: false, limit: 3 })");
  console.log("   - React Query calls: await getCampaignPlannerMetadata(B, 3)");
  console.log("   - ⚠️  THIS IS WHERE IT MIGHT HANG\n");
  
  const step2Start = Date.now();
  
  // Add timeout to detect hanging
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("TIMEOUT: Server action call took longer than 10 seconds - IT'S HANGING!")), 10000)
  );
  
  try {
    console.log("   ⏳ Calling getCampaignPlannerMetadata(B, 3)...");
    console.log("   ⏳ Waiting for response...\n");
    
    const projectBData = await Promise.race([
      getCampaignPlannerMetadata(toProjectId, 3),
      timeoutPromise
    ]) as Awaited<ReturnType<typeof getCampaignPlannerMetadata>>;
    
    const step2Duration = Date.now() - step2Start;
    
    console.log(`   ✅ Project B completed in ${step2Duration}ms`);
    console.log(`   📊 Campaigns: ${projectBData.chatsGroupedByCampaign.length}\n`);
    
    // Results
    console.log("=".repeat(80));
    console.log("RESULTS");
    console.log("=".repeat(80));
    console.log(`\nProject A:`);
    console.log(`   Duration: ${Date.now() - step1Start}ms`);
    console.log(`   Campaigns: ${projectAData.chatsGroupedByCampaign.length}`);
    
    console.log(`\nProject B:`);
    console.log(`   Duration: ${step2Duration}ms`);
    console.log(`   Campaigns: ${projectBData.chatsGroupedByCampaign.length}`);
    if (projectBData.chatsGroupedByCampaign.length > 0) {
      console.log(`   Names: ${projectBData.chatsGroupedByCampaign.map(c => c.name).join(', ')}`);
    }
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ TEST PASSED - Server action works when called directly");
    console.log("=".repeat(80));
    console.log("\n⚠️  If the page still hangs, the issue is:");
    console.log("   1. How React Query invokes server actions from the browser");
    console.log("   2. Network/serialization issues when calling from client");
    console.log("   3. Server action not being properly exposed to the client");
    console.log("\n💡 Solution: Convert to API route instead of server action\n");
    
  } catch (error) {
    const step2Duration = Date.now() - step2Start;
    
    console.log("=".repeat(80));
    console.log("❌ TEST FAILED - SERVER ACTION IS HANGING!");
    console.log("=".repeat(80));
    console.log(`⏱️  Duration before error: ${step2Duration}ms\n`);
    
    if (error instanceof Error) {
      if (error.message.includes("TIMEOUT")) {
        console.error("❌ CONFIRMED: Server action call is hanging!");
        console.error("   The function does not complete when called for Project B");
        console.error("   This is the exact issue you're experiencing\n");
        console.error("🔍 Possible causes:");
        console.error("   - Database connection issue");
        console.error("   - Prisma query hanging");
        console.error("   - Server action serialization issue");
        console.error("   - Memory/performance issue\n");
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
    
    process.exit(1);
  }
}

testServerActionCall().catch(console.error);
