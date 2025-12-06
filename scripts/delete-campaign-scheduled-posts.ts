/**
 * Script to delete all scheduled posts for a specific campaign
 * 
 * Usage:
 *   pnpm tsx scripts/delete-campaign-scheduled-posts.ts <campaignId>
 * 
 * Example:
 *   pnpm tsx scripts/delete-campaign-scheduled-posts.ts 1f27a5
 */

import { prisma } from "../src/lib/prisma";

async function deleteCampaignScheduledPosts(campaignId: string) {
  try {
    console.log(`\n🔍 Searching for scheduled posts for campaign: ${campaignId}\n`);

    // Find all scheduled posts and filter by campaignId in meta
    // MongoDB Prisma doesn't support path queries, so we fetch and filter
    // First, try to find posts with platform "webhook" (Blog News posts)
    const allScheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        OR: [
          { platform: "webhook" }, // Blog News posts
          { status: "pending" }, // All pending posts
        ],
      },
      select: {
        id: true,
        platform: true,
        date: true,
        status: true,
        meta: true,
      },
    });

    console.log(`📊 Found ${allScheduledPosts.length} total posts to check\n`);

    // Filter posts that have this campaignId in their meta
    // Try both exact match and partial match (in case it's a substring of ObjectId)
    const scheduledPosts = allScheduledPosts.filter((post) => {
      const meta = post.meta as any;
      const metaCampaignId = meta?.campaignId;
      
      // Exact match
      if (metaCampaignId === campaignId) {
        return true;
      }
      
      // Partial match (in case campaignId is a substring of ObjectId)
      if (typeof metaCampaignId === 'string' && metaCampaignId.includes(campaignId)) {
        return true;
      }
      
      // Also check if campaignId is at the end (common in MongoDB ObjectIds)
      if (typeof metaCampaignId === 'string' && metaCampaignId.endsWith(campaignId)) {
        return true;
      }
      
      return false;
    });

    console.log(`📊 Found ${scheduledPosts.length} scheduled post(s) for campaign ${campaignId}\n`);

    if (scheduledPosts.length === 0) {
      console.log("✅ No scheduled posts found. Nothing to delete.\n");
      return;
    }

    // Display the posts that will be deleted
    console.log("📋 Scheduled posts to be deleted:");
    console.log("=".repeat(80));
    scheduledPosts.forEach((post, index) => {
      const meta = post.meta as any;
      console.log(`${index + 1}. Post ID: ${post.id}`);
      console.log(`   Platform: ${post.platform}`);
      console.log(`   Date: ${new Date(post.date).toLocaleString()}`);
      console.log(`   Status: ${post.status}`);
      if (meta?.day) {
        console.log(`   Day: ${meta.day}`);
      }
      if (meta?.source) {
        console.log(`   Source: ${meta.source}`);
      }
      console.log("");
    });
    console.log("=".repeat(80));

    // Delete the scheduled posts by their IDs
    const postIds = scheduledPosts.map((post) => post.id);
    
    if (postIds.length === 0) {
      console.log("✅ No posts to delete.\n");
      return;
    }

    const result = await prisma.scheduledPost.deleteMany({
      where: {
        id: {
          in: postIds,
        },
      },
    });

    console.log(`\n✅ Successfully deleted ${result.count} scheduled post(s) for campaign ${campaignId}\n`);
  } catch (error) {
    console.error("\n❌ Error deleting scheduled posts:", error);
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
  console.error("Usage: pnpm tsx scripts/delete-campaign-scheduled-posts.ts <campaignId>");
  console.error("Example: pnpm tsx scripts/delete-campaign-scheduled-posts.ts 1f27a5\n");
  process.exit(1);
}

// Run the script
deleteCampaignScheduledPosts(campaignId);

