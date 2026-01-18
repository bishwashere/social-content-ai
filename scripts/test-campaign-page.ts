/**
 * Test the actual page URL - fetches what the browser would receive
 * 
 * Usage:
 *   npx tsx scripts/test-campaign-page.ts <projectId>
 * 
 * Example:
 *   npx tsx scripts/test-campaign-page.ts 6962e3a5bb1684876a59b516
 */

async function testCampaignPage(projectId: string) {
  const url = `http://localhost:3000/project/${projectId}?tab=campaign`;
  
  console.log("=".repeat(80));
  console.log("🧪 TESTING ACTUAL PAGE URL");
  console.log("=".repeat(80));
  console.log(`\n📍 URL: ${url}\n`);
  
  const startTime = Date.now();
  
  try {
    console.log("⏳ Fetching page...\n");
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/json',
      },
    });
    
    const duration = Date.now() - startTime;
    
    console.log("=".repeat(80));
    console.log("📊 RESPONSE DETAILS");
    console.log("=".repeat(80));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Content-Type: ${response.headers.get('content-type')}\n`);
    
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log("=".repeat(80));
      console.log("📦 JSON RESPONSE (Page returned JSON)");
      console.log("=".repeat(80));
      console.log(JSON.stringify(data, null, 2));
    } else if (contentType.includes('text/html')) {
      const html = await response.text();
      console.log("=".repeat(80));
      console.log("📄 HTML RESPONSE (Page returned HTML)");
      console.log("=".repeat(80));
      console.log(`HTML Length: ${html.length} characters\n`);
      
      // Try to extract any JSON data embedded in the page
      const jsonMatches = html.match(/<script[^>]*>[\s\S]*?({[\s\S]*?"chatsGroupedByCampaign"[\s\S]*?})[\s\S]*?<\/script>/gi);
      if (jsonMatches) {
        console.log("Found potential JSON data in script tags:");
        jsonMatches.forEach((match, i) => {
          console.log(`\nScript ${i + 1}:`);
          console.log(match.substring(0, 500) + "...");
        });
      }
      
      // Check for React Query data
      const reactQueryMatches = html.match(/__NEXT_DATA__|window\.__REACT_QUERY_STATE__/gi);
      if (reactQueryMatches) {
        console.log("\n✅ Found React Query state in page");
      }
      
      // Show first 2000 chars of HTML
      console.log("\nFirst 2000 characters of HTML:");
      console.log("-".repeat(80));
      console.log(html.substring(0, 2000));
      console.log("-".repeat(80));
    } else {
      const text = await response.text();
      console.log("=".repeat(80));
      console.log("📄 TEXT RESPONSE");
      console.log("=".repeat(80));
      console.log(text.substring(0, 1000));
    }
    
    console.log("\n" + "=".repeat(80));
    
    if (response.ok) {
      console.log("✅ PAGE LOADED SUCCESSFULLY");
    } else {
      console.log(`❌ PAGE RETURNED ERROR: ${response.status}`);
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.log("=".repeat(80));
    console.log("❌ ERROR FETCHING PAGE");
    console.log("=".repeat(80));
    console.log(`⏱️  Duration before error: ${duration}ms\n`);
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
        console.error("\n⚠️  Make sure the Next.js dev server is running on port 3000");
        console.error("   Run: npm run dev");
      }
    } else {
      console.error(`Unknown error:`, error);
    }
    
    process.exit(1);
  }
}

// Get projectId from command line arguments
const projectId = process.argv[2];

if (!projectId) {
  console.error("❌ Error: Project ID is required");
  console.error("\nUsage:");
  console.error("  npx tsx scripts/test-campaign-page.ts <projectId>");
  console.error("\nExample:");
  console.error("  npx tsx scripts/test-campaign-page.ts 6962e3a5bb1684876a59b516");
  process.exit(1);
}

testCampaignPage(projectId);
