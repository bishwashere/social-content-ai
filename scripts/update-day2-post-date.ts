/**
 * Script to update scheduled post date to past for testing
 * 
 * Usage:
 *   npx tsx scripts/update-day2-post-date.ts <day>
 *   Example: npx tsx scripts/update-day2-post-date.ts 3
 */

import { prisma } from "../src/lib/prisma";

async function updateDayPost(day: number) {
  try {
    const campaignId = "6934dc3dbe7a3ed6a335ba07";
    
    console.log(`\n🔍 Finding day ${day} scheduled post for campaign: ${campaignId}\n`);

    // Find all webhook posts and filter to find the specified day
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
    });

    const dayPosts = allPosts.filter((p) => {
      const meta = p.meta as any;
      return meta?.campaignId === campaignId && meta?.day === day;
    });

    if (dayPosts.length === 0) {
      console.log(`❌ No day ${day} post found for this campaign.`);
      return;
    }

    const post = dayPosts[0];
    console.log(`✅ Found day ${day} post:`);
    console.log(`   ID: ${post.id}`);
    console.log(`   Current Date: ${new Date(post.date).toISOString()}`);
    console.log(`   Status: ${post.status}`);
    console.log("");

    // Set date to 5 minutes ago
    const pastDate = new Date();
    pastDate.setMinutes(pastDate.getMinutes() - 5);

    // Update the post
    await prisma.scheduledPost.update({
      where: { id: post.id },
      data: {
        date: pastDate.toISOString(),
        status: "pending", // Ensure it's pending
      },
    });

    console.log(`✅ Updated day ${day} post:`);
    console.log(`   New Date: ${pastDate.toISOString()}`);
    console.log(`   Status: pending`);
    console.log(`\n🎯 Ready to test! Run: curl http://localhost:3000/api/post`);
  } catch (error) {
    console.error(`\n❌ Error updating day ${day} post:`, error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get day from command line argument or default to 2
const day = process.argv[2] ? parseInt(process.argv[2], 10) : 2;
updateDayPost(day);

