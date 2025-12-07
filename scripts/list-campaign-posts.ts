/**
 * Script to list all scheduled posts for a campaign
 * 
 * Usage:
 *   npx tsx scripts/list-campaign-posts.ts
 */

import { prisma } from "../src/lib/prisma";

async function listCampaignPosts() {
  try {
    const campaignId = "6934dc3dbe7a3ed6a335ba07";
    
    console.log(`\n🔍 Finding all scheduled posts for campaign: ${campaignId}\n`);

    const allPosts = await prisma.scheduledPost.findMany({
      where: {
        platform: "webhook",
      },
      select: {
        id: true,
        date: true,
        status: true,
        meta: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const campaignPosts = allPosts.filter((p) => {
      const meta = p.meta as any;
      return meta?.campaignId === campaignId;
    });

    if (campaignPosts.length === 0) {
      console.log("❌ No posts found for this campaign.");
      return;
    }

    console.log(`📊 Found ${campaignPosts.length} posts:\n`);
    campaignPosts.forEach((post, index) => {
      const meta = post.meta as any;
      console.log(`${index + 1}. Day ${meta?.day || "N/A"}`);
      console.log(`   ID: ${post.id}`);
      console.log(`   Date: ${new Date(post.date).toISOString()}`);
      console.log(`   Status: ${post.status}`);
      console.log("");
    });
  } catch (error) {
    console.error("\n❌ Error listing posts:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listCampaignPosts();

