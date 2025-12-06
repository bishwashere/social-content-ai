/**
 * Script to check the start date stored in database for a campaign
 * 
 * Usage:
 *   npx tsx scripts/check-campaign-start-date.ts <campaignId>
 * 
 * Example:
 *   npx tsx scripts/check-campaign-start-date.ts d464e4
 */

import { prisma } from "../src/lib/prisma";

async function checkCampaignStartDate(campaignId: string) {
  try {
    console.log(`\n🔍 Checking campaign: ${campaignId}\n`);

    // Find the campaign - search by partial ID match
    const allCampaigns = await prisma.campaignPlanner.findMany({
      select: {
        id: true,
        name: true,
        startDate: true,
        autoPostTime: true,
        autoPostEnabled: true,
        goal: true,
        chats: {
          select: {
            day: true,
            title: true,
          },
          orderBy: {
            day: 'asc',
          },
        },
      },
    });

    // Filter by partial ID match
    const campaign = allCampaigns.find(c => c.id.includes(campaignId) || c.id.endsWith(campaignId));

    if (!campaign) {
      console.log(`❌ Campaign not found with ID containing: ${campaignId}`);
      console.log(`\nFound ${allCampaigns.length} total campaigns.`);
      if (allCampaigns.length > 0) {
        console.log("\nRecent campaigns (last 5):");
        allCampaigns.slice(0, 5).forEach((c, i) => {
          console.log(`   ${i + 1}. ID: ${c.id}, Name: ${c.name || "Untitled"}`);
        });
      }
      console.log("");
      return;
    }

    console.log("=".repeat(80));
    console.log("📋 CAMPAIGN DETAILS");
    console.log("=".repeat(80));
    console.log(`Campaign ID: ${campaign.id}`);
    console.log(`Campaign Name: ${campaign.name || "Untitled"}`);
    console.log(`Goal: ${campaign.goal}`);
    console.log(`Auto-post Enabled: ${campaign.autoPostEnabled ? "Yes" : "No"}`);
    console.log(`Auto-post Time: ${campaign.autoPostTime || "Not set"}`);
    console.log("");

    if (campaign.startDate) {
      const startDate = new Date(campaign.startDate);
      console.log("📅 START DATE INFORMATION:");
      console.log("-".repeat(80));
      console.log(`Raw ISO String: ${campaign.startDate.toISOString()}`);
      console.log(`Local Date String: ${startDate.toLocaleDateString()}`);
      console.log(`Local Time String: ${startDate.toLocaleTimeString()}`);
      console.log(`Full Local String: ${startDate.toLocaleString()}`);
      console.log(`UTC Date: ${startDate.getUTCDate()}`);
      console.log(`UTC Month: ${startDate.getUTCMonth() + 1} (0-indexed, so +1)`);
      console.log(`UTC Year: ${startDate.getUTCFullYear()}`);
      console.log(`UTC Hours: ${startDate.getUTCHours()}`);
      console.log(`UTC Minutes: ${startDate.getUTCMinutes()}`);
      console.log(`Local Date: ${startDate.getDate()}`);
      console.log(`Local Month: ${startDate.getMonth() + 1} (0-indexed, so +1)`);
      console.log(`Local Year: ${startDate.getFullYear()}`);
      console.log(`Local Hours: ${startDate.getHours()}`);
      console.log(`Local Minutes: ${startDate.getMinutes()}`);
      console.log("");
      
      // Show what the calculation would produce for day 1
      if (campaign.autoPostTime) {
        const [hours, minutes] = campaign.autoPostTime.split(":").map(Number);
        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        const day = startDate.getDate();
        
        // Method 1: Using date components (new method)
        const calculatedDate1 = new Date(year, month, day, hours, minutes, 0, 0);
        console.log("📊 CALCULATED DATE FOR DAY 1 (using date components):");
        console.log(`   ${calculatedDate1.toLocaleString()}`);
        console.log(`   ISO: ${calculatedDate1.toISOString()}`);
        console.log("");
        
        // Method 2: Using setDate (old method)
        const startDateCopy = new Date(campaign.startDate);
        startDateCopy.setHours(0, 0, 0, 0);
        const calculatedDate2 = new Date(startDateCopy);
        calculatedDate2.setDate(calculatedDate2.getDate() + (1 - 1));
        calculatedDate2.setHours(hours, minutes, 0, 0);
        console.log("📊 CALCULATED DATE FOR DAY 1 (using setDate method):");
        console.log(`   ${calculatedDate2.toLocaleString()}`);
        console.log(`   ISO: ${calculatedDate2.toISOString()}`);
        console.log("");
      }
    } else {
      console.log("❌ No start date set for this campaign");
    }

    console.log(`📝 Total Chats: ${campaign.chats.length}`);
    if (campaign.chats.length > 0) {
      console.log("\nChat Days:");
      campaign.chats.slice(0, 10).forEach((chat) => {
        console.log(`   Day ${chat.day}: ${chat.title || "No title"}`);
      });
      if (campaign.chats.length > 10) {
        console.log(`   ... and ${campaign.chats.length - 10} more`);
      }
    }

    console.log("\n" + "=".repeat(80));
  } catch (error) {
    console.error("\n❌ Error checking campaign:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get campaign ID from command line arguments
const campaignId = process.argv[2];

if (!campaignId) {
  console.error("\n❌ Error: Campaign ID is required");
  console.error("Usage: npx tsx scripts/check-campaign-start-date.ts <campaignId>");
  console.error("Example: npx tsx scripts/check-campaign-start-date.ts d464e4\n");
  process.exit(1);
}

// Run the script
checkCampaignStartDate(campaignId);

