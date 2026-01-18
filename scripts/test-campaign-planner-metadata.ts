/**
 * Test the getCampaignPlannerMetadata function
 * 
 * Usage:
 *   pnpm tsx scripts/test-campaign-planner-metadata.ts [projectId]
 * 
 * Example:
 *   pnpm tsx scripts/test-campaign-planner-metadata.ts 6962e3a5bb1684876a59b516
 */

import { getCampaignPlannerMetadata } from "../src/backend-apis/campaign-planner/index";

async function testCampaignPlannerMetadata(projectId: string) {
  console.log("🧪 Testing getCampaignPlannerMetadata function\n");
  console.log(`📋 Project ID: ${projectId}\n`);
  console.log("=".repeat(80));
  
  const startTime = Date.now();
  
  try {
    console.log("⏳ Calling getCampaignPlannerMetadata...\n");
    
    const result = await getCampaignPlannerMetadata(projectId, 3);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("=".repeat(80));
    console.log("✅ SUCCESS");
    console.log("=".repeat(80));
    console.log(`⏱️  Duration: ${duration}ms\n`);
    console.log(`📊 Campaigns found: ${result.chatsGroupedByCampaign.length}\n`);
    
    if (result.chatsGroupedByCampaign.length > 0) {
      console.log("📋 Campaign Details (What you'll see on the page):");
      console.log("-".repeat(80));
      result.chatsGroupedByCampaign.forEach((campaign, index) => {
        console.log(`\n${index + 1}. ${campaign.name || 'Unnamed Campaign'}`);
        console.log(`   ID: ${campaign.id}`);
        console.log(`   Goal: ${campaign.goal}`);
        console.log(`   Target Audience: ${campaign.targetAudience}`);
        console.log(`   Start Date: ${campaign.startDate ? new Date(campaign.startDate).toLocaleString() : 'Not set'}`);
        console.log(`   Updated: ${new Date(campaign.updatedAt).toLocaleString()}`);
        console.log(`   Platforms: ${campaign.platforms.join(', ') || 'None'}`);
        console.log(`   Auto Post Enabled: ${campaign.autoPostEnabled ? 'Yes' : 'No'}`);
        if (campaign.autoPostEnabled) {
          console.log(`   Auto Post Time: ${campaign.autoPostTime || 'Not set'}`);
          console.log(`   Auto Post Platforms: ${campaign.autoPostPlatforms.join(', ') || 'None'}`);
        }
        console.log(`   Chat Count: ${campaign.chatCount} (chats will load on demand when campaign is opened)`);
        console.log(`   Chats Array Length: ${campaign.chats.length} (should be 0 for metadata mode)`);
        if (campaign.blogNewsMetadata) {
          console.log(`   Blog News Metadata: Yes`);
          console.log(`     Topics: ${(campaign.blogNewsMetadata as any)?.topics?.join(', ') || 'None'}`);
          console.log(`     Angles: ${(campaign.blogNewsMetadata as any)?.angles?.join(', ') || 'None'}`);
          console.log(`     Webhook: ${(campaign.blogNewsMetadata as any)?.webhook || 'Not set'}`);
        }
      });
      console.log("\n" + "-".repeat(80));
      console.log(`\n✅ This is what will be displayed on:`);
      console.log(`   http://localhost:3000/project/${projectId}?tab=campaign`);
      console.log(`\n📝 Note: Chats are loaded separately when you open a campaign.`);
    } else {
      console.log("ℹ️  No campaigns found for this project\n");
      console.log(`   The page will show: "No campaigns yet" or empty state`);
    }
    
    console.log("=".repeat(80));
    console.log("📦 Full Response:");
    console.log("=".repeat(80));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(80));
    
    // Performance check
    if (duration > 5000) {
      console.log("\n⚠️  WARNING: Query took longer than 5 seconds!");
      process.exit(1);
    } else if (duration > 2000) {
      console.log("\n⚠️  WARNING: Query took longer than 2 seconds (might be slow)");
    } else {
      console.log("\n✅ Performance: Good (< 2 seconds)");
    }
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log("=".repeat(80));
    console.log("❌ ERROR");
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
    
    console.log("=".repeat(80));
    process.exit(1);
  }
}

// Get projectId from command line arguments
const projectId = process.argv[2];

if (!projectId) {
  console.error("❌ Error: Project ID is required");
  console.error("\nUsage:");
  console.error("  pnpm tsx scripts/test-campaign-planner-metadata.ts <projectId>");
  console.error("\nExample:");
  console.error("  pnpm tsx scripts/test-campaign-planner-metadata.ts 6962e3a5bb1684876a59b516");
  process.exit(1);
}

// Validate projectId format (basic check - should be a valid MongoDB ObjectId string)
if (projectId.length < 20) {
  console.error("❌ Error: Project ID appears to be invalid (too short)");
  process.exit(1);
}

testCampaignPlannerMetadata(projectId);
