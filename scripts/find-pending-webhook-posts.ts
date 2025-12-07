/**
 * Script to list all pending webhook posts
 */

import { prisma } from "../src/lib/prisma";

async function findPendingPosts() {
  try {
    const posts = await prisma.scheduledPost.findMany({
      where: {
        platform: "webhook",
        status: "pending",
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

    console.log(`\n📊 Found ${posts.length} pending webhook posts:\n`);
    posts.forEach((post, index) => {
      const meta = post.meta as any;
      const postDate = new Date(post.date);
      console.log(`${index + 1}. ID: ${post.id.substring(0, 12)}...`);
      console.log(`   Date (UTC): ${postDate.toISOString()}`);
      console.log(`   Date (Local): ${postDate.toLocaleString()}`);
      console.log(`   Campaign: ${meta?.campaignId || "N/A"}`);
      console.log(`   Day: ${meta?.day || "N/A"}`);
      console.log("");
    });
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

findPendingPosts();

