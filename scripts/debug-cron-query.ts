/**
 * Script to debug why cron job isn't finding scheduled posts
 * 
 * Usage:
 *   pnpm tsx scripts/debug-cron-query.ts <campaignId>
 */

import { prisma } from "../src/lib/prisma";

async function debugCronQuery(campaignId: string) {
  try {
    console.log(`\n🔍 Debugging cron query for campaign: ${campaignId}\n`);
    console.log(`⏰ Current time: ${new Date().toISOString()}`);
    console.log(`⏰ Current time (local): ${new Date().toLocaleString()}\n`);

    // Get all scheduled posts for this campaign (any status)
    const allScheduledPosts = await prisma.scheduledPost.findMany({
      select: {
        id: true,
        platform: true,
        date: true,
        status: true,
        meta: true,
        createdAt: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Filter posts for this campaign
    const campaignPosts = allScheduledPosts.filter((post) => {
      const meta = post.meta as any;
      const metaCampaignId = meta?.campaignId;
      return typeof metaCampaignId === 'string' && 
             (metaCampaignId === campaignId || 
              metaCampaignId.includes(campaignId) || 
              metaCampaignId.endsWith(campaignId));
    });

    console.log(`📊 Found ${campaignPosts.length} total scheduled posts for campaign ${campaignId}\n`);

    if (campaignPosts.length === 0) {
      console.log("❌ No scheduled posts found for this campaign.\n");
      return;
    }

    // Check what the cron job query would find
    const now = new Date();
    const pendingPosts = campaignPosts.filter((post) => {
      return post.status === "pending" && new Date(post.date) <= now;
    });

    console.log("=".repeat(80));
    console.log("📋 CRON JOB QUERY ANALYSIS");
    console.log("=".repeat(80));
    console.log(`Query: status === "pending" AND date <= ${now.toISOString()}`);
    console.log(`Expected to find: ${pendingPosts.length} posts\n`);

    // Group by status
    const byStatus = campaignPosts.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("📊 Posts by status:");
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log("");

    // Show detailed info for each post
    console.log("=".repeat(80));
    console.log("📝 DETAILED POST INFORMATION");
    console.log("=".repeat(80));
    
    campaignPosts.forEach((post, index) => {
      const meta = post.meta as any;
      const postDate = new Date(post.date);
      const isPast = postDate <= now;
      const isPending = post.status === "pending";
      const shouldBeProcessed = isPending && isPast;
      
      console.log(`\n${index + 1}. Post ID: ${post.id.substring(0, 12)}...`);
      console.log(`   Platform: ${post.platform}`);
      console.log(`   Status: ${post.status} ${shouldBeProcessed ? "✅ SHOULD BE PROCESSED" : "❌ WON'T BE PROCESSED"}`);
      console.log(`   Day: ${meta?.day || "N/A"}`);
      console.log(`   Scheduled Date (ISO): ${post.date.toISOString()}`);
      console.log(`   Scheduled Date (Local): ${postDate.toLocaleString()}`);
      console.log(`   Is Past: ${isPast ? "✅ YES" : "❌ NO"} (${postDate <= now ? "past" : "future"})`);
      console.log(`   Is Pending: ${isPending ? "✅ YES" : "❌ NO"}`);
      console.log(`   Time Difference: ${Math.round((now.getTime() - postDate.getTime()) / 1000 / 60)} minutes`);
      
      if (!shouldBeProcessed) {
        if (!isPending) {
          console.log(`   ⚠️  REASON: Status is "${post.status}", not "pending"`);
        }
        if (!isPast) {
          console.log(`   ⚠️  REASON: Date is in the future`);
        }
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log("🔍 TESTING CRON QUERY DIRECTLY");
    console.log("=".repeat(80));

    // Test the exact query the cron job uses
    const cronQueryResults = await prisma.scheduledPost.findMany({
      where: {
        status: "pending",
        date: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
        platform: true,
        date: true,
        status: true,
        meta: true,
      },
    });

    // Filter for this campaign
    const cronQueryCampaignPosts = cronQueryResults.filter((post) => {
      const meta = post.meta as any;
      const metaCampaignId = meta?.campaignId;
      return typeof metaCampaignId === 'string' && 
             (metaCampaignId === campaignId || 
              metaCampaignId.includes(campaignId) || 
              metaCampaignId.endsWith(campaignId));
    });

    console.log(`\n📊 Cron query found ${cronQueryResults.length} total pending posts`);
    console.log(`📊 Cron query found ${cronQueryCampaignPosts.length} posts for this campaign\n`);

    if (cronQueryCampaignPosts.length === 0 && pendingPosts.length > 0) {
      console.log("⚠️  MISMATCH DETECTED!");
      console.log("   JavaScript filter found posts, but Prisma query didn't.");
      console.log("   This suggests a timezone or date comparison issue.\n");
    }

    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const campaignId = process.argv[2] || "bc6f9e";
debugCronQuery(campaignId);

