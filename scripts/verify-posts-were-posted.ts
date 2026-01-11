/**
 * Verify if posts were actually posted to social media
 */

import { prisma } from "../src/lib/prisma";

async function verifyPosts(campaignId: string) {
  try {
    console.log(`\n🔍 Verifying posts for campaign: ${campaignId}\n`);

    const campaign = await prisma.campaignPlanner.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      console.log(`❌ Campaign not found\n`);
      return;
    }

    // Get platform posts
    const allPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: campaign.projectId,
      },
      select: {
        id: true,
        platform: true,
        date: true,
        status: true,
        processedAt: true,
        meta: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const platformPosts = allPosts.filter((post) => {
      const meta = post.meta as any;
      return (
        post.platform !== "webhook" &&
        (meta?.blogNewsPostId || 
         (meta?.campaignId === campaignId && meta?.source === "blog-news"))
      );
    });

    console.log(`📊 Found ${platformPosts.length} platform posts\n`);

    // Check ProjectTracking for these posts
    const trackingRecords = await prisma.projectTracking.findMany({
      where: {
        projectId: campaign.projectId,
        date: {
          gte: platformPosts[0]?.date || new Date(0),
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    console.log(`📊 Found ${trackingRecords.length} tracking records\n`);

    // Match posts with tracking records
    console.log(`📋 Post Verification:\n`);
    platformPosts.forEach((post, idx) => {
      const meta = post.meta as any;
      const matchingTracking = trackingRecords.filter((track) => {
        // Try to match by date (within 5 minutes) and platform
        const timeDiff = Math.abs(track.date.getTime() - post.date.getTime());
        return timeDiff < 5 * 60 * 1000 && track.platform === post.platform;
      });

      console.log(`   ${idx + 1}. Post ${post.id.substring(0, 12)}... (${post.platform})`);
      console.log(`      Scheduled Date: ${post.date.toISOString()}`);
      console.log(`      Status: ${post.status}`);
      console.log(`      Processed At: ${post.processedAt?.toISOString() || "NOT SET"}`);
      console.log(`      Day: ${meta?.day || "N/A"}`);
      console.log(`      Tracking Records: ${matchingTracking.length}`);
      
      if (matchingTracking.length > 0) {
        matchingTracking.forEach((track) => {
          console.log(`        ✅ Found: ${track.url} (${track.date.toISOString()})`);
        });
      } else {
        console.log(`        ⚠️  NO TRACKING RECORD FOUND`);
        console.log(`        This suggests the post may not have been actually posted`);
      }
      console.log("");
    });

    // Summary
    const successPosts = platformPosts.filter((p) => p.status === "success");
    const postsWithTracking = platformPosts.filter((post) => {
      const matchingTracking = trackingRecords.filter((track) => {
        const timeDiff = Math.abs(track.date.getTime() - post.date.getTime());
        return timeDiff < 5 * 60 * 1000 && track.platform === post.platform;
      });
      return matchingTracking.length > 0;
    });

    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${"=".repeat(80)}\n`);
    console.log(`   Total Platform Posts: ${platformPosts.length}`);
    console.log(`   Status = "success": ${successPosts.length}`);
    console.log(`   Has Tracking Record: ${postsWithTracking.length}`);
    console.log(`   Missing Tracking: ${platformPosts.length - postsWithTracking.length}\n`);

    if (postsWithTracking.length < platformPosts.length) {
      console.log(`⚠️  ISSUE FOUND:`);
      console.log(`   ${platformPosts.length - postsWithTracking.length} posts show status "success"`);
      console.log(`   but have no tracking records, suggesting they weren't actually posted.\n`);
    }

    // Check if posts were processed
    const processedPosts = platformPosts.filter((p) => p.processedAt);
    console.log(`   Processed At Set: ${processedPosts.length}`);
    if (processedPosts.length < platformPosts.length) {
      console.log(`   ⚠️  ${platformPosts.length - processedPosts.length} posts don't have processedAt set`);
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

const campaignId = process.argv[2] || "6935eb173226eb6d27806646";
verifyPosts(campaignId);
