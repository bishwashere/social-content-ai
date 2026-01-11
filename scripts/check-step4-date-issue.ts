/**
 * Check why Step 4 is failing with "Scheduled date is in the past"
 */

import { prisma } from "../src/lib/prisma";

async function checkStep4Issue() {
  try {
    const campaignId = "6962dea053e359ba46a1c407";
    
    // Find the webhook post that completed Step 4
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

    const webhookPost = allPosts.find((post) => {
      const meta = post.meta as any;
      return (
        meta?.campaignId === campaignId &&
        meta?.step4Completed === true
      );
    });

    if (!webhookPost) {
      console.log("No webhook post with Step 4 completed found\n");
      return;
    }

    const meta = webhookPost.meta as any;
    const now = new Date();
    
    console.log(`\n🔍 Analyzing Step 4 Date Issue\n`);
    console.log(`Webhook Post ID: ${webhookPost.id}`);
    console.log(`Webhook Post Date: ${webhookPost.date.toISOString()}`);
    console.log(`Current Time: ${now.toISOString()}`);
    console.log(`Time Difference: ${Math.round((now.getTime() - webhookPost.date.getTime()) / 1000 / 60)} minutes`);
    console.log(`\nStep 4 Result:`);
    console.log(`  Article URL: ${meta?.articleUrl || "NONE"}`);
    console.log(`  Platforms: ${meta?.platforms?.join(", ") || "NONE"}`);
    console.log(`  Platform Posts: ${JSON.stringify(meta?.platformPosts, null, 2)}\n`);

    // Calculate what date Step 4 would have tried to use
    const step4Date = new Date(webhookPost.date);
    step4Date.setMinutes(step4Date.getMinutes() + 1);
    
    console.log(`Step 4 would schedule for: ${step4Date.toISOString()}`);
    console.log(`This is ${step4Date < now ? "IN THE PAST" : "IN THE FUTURE"}`);
    console.log(`Difference: ${Math.round((now.getTime() - step4Date.getTime()) / 1000 / 60)} minutes\n`);

    console.log(`\n⚠️  ISSUE IDENTIFIED:`);
    console.log(`   The webhook post was scheduled for: ${webhookPost.date.toISOString()}`);
    console.log(`   Step 4 tried to schedule platform post for: ${step4Date.toISOString()} (original + 1 minute)`);
    console.log(`   But by the time Step 4 ran, this date was already in the past!`);
    console.log(`   This is why schedulePost() rejected it with "Scheduled date is in the past"\n`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStep4Issue();
