/**
 * Test project switching via actual HTTP requests (like the browser does)
 * Simulates the exact same requests the browser makes when switching projects
 * 
 * Usage:
 *   npx tsx scripts/test-project-switch-http.ts
 */

async function testProjectSwitchViaHTTP() {
  const fromProjectId = '6962e39ebb1684876a59b513';
  const toProjectId = '6962e3a5bb1684876a59b516';
  const baseUrl = 'http://localhost:3000';
  
  console.log("=".repeat(80));
  console.log("🧪 TESTING PROJECT SWITCH VIA HTTP (Like Browser Does)");
  console.log("=".repeat(80));
  console.log(`\n📍 FROM: ${baseUrl}/project/${fromProjectId}?tab=campaign`);
  console.log(`📍 TO:   ${baseUrl}/project/${toProjectId}?tab=campaign\n`);
  
  // Step 1: User is on Project A - make the same requests browser makes
  console.log("=".repeat(80));
  console.log("STEP 1: User is on Project A (making browser requests)");
  console.log("=".repeat(80));
  
  const step1Start = Date.now();
  
  try {
    // These are the requests the browser makes (from your terminal logs)
    console.log("   📡 POST /project/" + fromProjectId);
    const projectARequest1 = await fetch(`${baseUrl}/project/${fromProjectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const projectARequest1Duration = Date.now() - step1Start;
    console.log(`   ✅ Response: ${projectARequest1.status} in ${projectARequest1Duration}ms`);
    
    console.log("   📡 POST /project/" + fromProjectId + "?tab=campaign");
    const projectARequest2 = await fetch(`${baseUrl}/project/${fromProjectId}?tab=campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const projectARequest2Duration = Date.now() - step1Start;
    console.log(`   ✅ Response: ${projectARequest2.status} in ${projectARequest2Duration}ms`);
    
    const step1Total = Date.now() - step1Start;
    console.log(`\n   ✅ Project A loaded in ${step1Total}ms total\n`);
    
  } catch (error) {
    console.error("   ❌ Error loading Project A:", error);
    throw error;
  }
  
  // Step 2: User clicks to switch to Project B
  console.log("=".repeat(80));
  console.log("STEP 2: User clicks to switch to Project B");
  console.log("=".repeat(80));
  console.log("   - Browser should cancel previous requests");
  console.log("   - Browser should clear React Query cache");
  console.log("   - New requests for Project B should start\n");
  
  // Small delay to simulate the switch
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Step 3: New requests for Project B (this is where it might hang)
  console.log("=".repeat(80));
  console.log("STEP 3: Making requests for Project B (where hanging might occur)");
  console.log("=".repeat(80));
  
  const step3Start = Date.now();
  
  try {
    console.log("   📡 POST /project/" + toProjectId);
    const projectBRequest1Promise = fetch(`${baseUrl}/project/${toProjectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add timeout to detect hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT: Request took longer than 10 seconds")), 10000)
    );
    
    const projectBRequest1 = await Promise.race([projectBRequest1Promise, timeoutPromise]) as Response;
    const projectBRequest1Duration = Date.now() - step3Start;
    console.log(`   ✅ Response: ${projectBRequest1.status} in ${projectBRequest1Duration}ms`);
    
    if (!projectBRequest1.ok) {
      const text = await projectBRequest1.text();
      console.log(`   ⚠️  Response body: ${text.substring(0, 200)}`);
    }
    
    console.log("   📡 POST /project/" + toProjectId + "?tab=campaign");
    const projectBRequest2Promise = fetch(`${baseUrl}/project/${toProjectId}?tab=campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const projectBRequest2 = await Promise.race([projectBRequest2Promise, timeoutPromise]) as Response;
    const projectBRequest2Duration = Date.now() - step3Start;
    console.log(`   ✅ Response: ${projectBRequest2.status} in ${projectBRequest2Duration}ms`);
    
    if (!projectBRequest2.ok) {
      const text = await projectBRequest2.text();
      console.log(`   ⚠️  Response body: ${text.substring(0, 200)}`);
    }
    
    const step3Total = Date.now() - step3Start;
    console.log(`\n   ✅ Project B loaded in ${step3Total}ms total\n`);
    
    // Step 4: Results
    console.log("=".repeat(80));
    console.log("STEP 4: Results");
    console.log("=".repeat(80));
    console.log(`\nProject A (${fromProjectId}):`);
    console.log(`   Total duration: ${Date.now() - step1Start}ms`);
    console.log(`   Status: ✅ Loaded`);
    
    console.log(`\nProject B (${toProjectId}):`);
    console.log(`   Total duration: ${step3Total}ms`);
    console.log(`   Status: ✅ Loaded`);
    
    console.log("\n" + "=".repeat(80));
    console.log("✅ PROJECT SWITCH TEST PASSED");
    console.log("=".repeat(80));
    console.log("\nBoth projects loaded successfully via HTTP requests.");
    console.log("If this works but the page hangs, check:");
    console.log("  - Browser console for errors");
    console.log("  - Network tab for pending requests");
    console.log("  - React Query DevTools for query status\n");
    
  } catch (error) {
    const step3Duration = Date.now() - step3Start;
    
    console.log("=".repeat(80));
    console.log("❌ PROJECT SWITCH TEST FAILED");
    console.log("=".repeat(80));
    console.log(`⏱️  Duration before error: ${step3Duration}ms\n`);
    
    if (error instanceof Error) {
      if (error.message.includes("TIMEOUT")) {
        console.error("❌ TIMEOUT: Project B request took longer than 10 seconds");
        console.error("   This confirms the hanging issue!");
        console.error("   The HTTP request is not completing.\n");
      } else if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
        console.error("❌ Connection Error: Could not connect to server");
        console.error("   Make sure Next.js dev server is running: npm run dev\n");
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
    
    console.log("\n❌ This confirms the issue - the HTTP request hangs when switching projects\n");
    throw error;
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/session', {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log("Checking if server is running...\n");
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error("❌ Error: Next.js dev server is not running on port 3000");
    console.error("   Please start it with: npm run dev\n");
    process.exit(1);
  }
  
  console.log("✅ Server is running\n");
  await testProjectSwitchViaHTTP();
}

main().catch(console.error);
