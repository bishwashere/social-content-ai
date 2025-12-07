/**
 * Script to delete all Blog News campaigns for a specific user
 * 
 * Usage:
 *   pnpm tsx scripts/delete-user-blog-campaigns.ts <userId>
 * 
 * Example:
 *   pnpm tsx scripts/delete-user-blog-campaigns.ts 684a8843d67b1650774b3f4c
 */

import { prisma } from "../src/lib/prisma";

async function deleteUserBlogCampaigns(userId: string) {
  try {
    console.log(`\n🔍 Finding Blog News campaigns for user: ${userId}\n`);

    // First, find all projects owned by this user
    const userProjects = await prisma.projects.findMany({
      where: {
        userId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (userProjects.length === 0) {
      console.log("❌ No projects found for this user.\n");
      return;
    }

    console.log(`📁 Found ${userProjects.length} project(s) for user:`);
    userProjects.forEach((p) => {
      console.log(`   - ${p.name} (${p.id})`);
    });

    const projectIds = userProjects.map((p) => p.id);

    // Find all Blog News campaigns for these projects
    const blogCampaigns = await prisma.campaignPlanner.findMany({
      where: {
        projectId: { in: projectIds },
        goal: "Blog News",
      },
      select: {
        id: true,
        name: true,
        projectId: true,
        goal: true,
      },
    });

    if (blogCampaigns.length === 0) {
      console.log("\n✅ No Blog News campaigns found for this user.\n");
      return;
    }

    console.log(`\n📋 Found ${blogCampaigns.length} Blog News campaign(s):`);
    blogCampaigns.forEach((campaign) => {
      const project = userProjects.find((p) => p.id === campaign.projectId);
      console.log(`   - ${campaign.name || "Untitled"} (ID: ${campaign.id}, Project: ${project?.name || campaign.projectId})`);
    });

    // Find all scheduled posts related to these campaigns
    const allScheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: { in: projectIds },
      },
      select: {
        id: true,
        platform: true,
        status: true,
        meta: true,
      },
    });

    // Filter posts that belong to these blog campaigns
    const campaignPostIds: string[] = [];
    const campaignIds = blogCampaigns.map((c) => c.id);

    allScheduledPosts.forEach((post) => {
      const meta = post.meta as any;
      if (meta?.campaignId && campaignIds.includes(meta.campaignId)) {
        campaignPostIds.push(post.id);
      }
    });

    console.log(`\n📝 Found ${campaignPostIds.length} scheduled post(s) related to these campaigns`);

    // Ask for confirmation
    console.log("\n⚠️  WARNING: This will delete:");
    console.log(`   - ${blogCampaigns.length} Blog News campaign(s)`);
    console.log(`   - All associated campaign chats (cascade delete)`);
    console.log(`   - ${campaignPostIds.length} scheduled post(s)`);
    console.log("\nThis action cannot be undone!\n");

    // Delete scheduled posts first
    if (campaignPostIds.length > 0) {
      console.log("🗑️  Deleting scheduled posts...");
      const deletePostsResult = await prisma.scheduledPost.deleteMany({
        where: {
          id: { in: campaignPostIds },
        },
      });
      console.log(`   ✅ Deleted ${deletePostsResult.count} scheduled post(s)`);
    }

    // Delete campaigns (chats will be cascade deleted)
    console.log("\n🗑️  Deleting Blog News campaigns...");
    const deleteCampaignsResult = await prisma.campaignPlanner.deleteMany({
      where: {
        id: { in: campaignIds },
      },
    });
    console.log(`   ✅ Deleted ${deleteCampaignsResult.count} campaign(s)`);

    console.log("\n✅ All Blog News campaigns and related data have been deleted successfully!\n");
  } catch (error) {
    console.error("\n❌ Error deleting Blog News campaigns:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get userId from command line arguments
const userId = process.argv[2];

if (!userId) {
  console.error("\n❌ Error: User ID is required");
  console.error("Usage: pnpm tsx scripts/delete-user-blog-campaigns.ts <userId>\n");
  process.exit(1);
}

deleteUserBlogCampaigns(userId);
