/**
 * Script to check scheduled posts for a specific campaign
 * 
 * Usage:
 *   npx tsx scripts/check-scheduled-posts-for-campaign.ts <campaignId>
 */

import { prisma } from "../src/lib/prisma";

async function checkScheduledPosts(campaignId: string) {
  try {
    console.log(`\n🔍 Checking scheduled posts for campaign: ${campaignId}\n`);

    const allPosts = await prisma.scheduledPost.findMany({
      where: {
        platform: "webhook",
        status: "pending",
      },
      select: {
        id: true,
        platform: true,
        date: true,
        status: true,
        meta: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Filter posts for this campaign
    const posts = allPosts.filter((post) => {
      const meta = post.meta as any;
      const metaCampaignId = meta?.campaignId;
      return typeof metaCampaignId === 'string' && 
             (metaCampaignId === campaignId || 
              metaCampaignId.includes(campaignId) || 
              metaCampaignId.endsWith(campaignId));
    });

    console.log(`📊 Found ${posts.length} scheduled posts for campaign ${campaignId}\n`);

    if (posts.length === 0) {
      console.log("No scheduled posts found.\n");
      return;
    }

    console.log("=".repeat(80));
    posts.forEach((post, index) => {
      const meta = post.meta as any;
      const postDate = new Date(post.date);
      console.log(`${index + 1}. Post ID: ${post.id}`);
      console.log(`   Day: ${meta?.day || "N/A"}`);
      console.log(`   Raw ISO: ${post.date.toISOString()}`);
      console.log(`   Local: ${postDate.toLocaleString()}`);
      console.log(`   Local Date: ${postDate.toLocaleDateString()}`);
      console.log(`   Local Time: ${postDate.toLocaleTimeString()}`);
      console.log(`   UTC Date: ${postDate.getUTCDate()}`);
      console.log(`   UTC Month: ${postDate.getUTCMonth() + 1}`);
      console.log(`   Local Date Component: ${postDate.getDate()}`);
      console.log(`   Local Month Component: ${postDate.getMonth() + 1}`);
      console.log("");
    });
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const campaignId = process.argv[2] || "d464e4";
checkScheduledPosts(campaignId);

