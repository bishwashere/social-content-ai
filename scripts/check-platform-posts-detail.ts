/**
 * Detailed check of platform posts for a campaign
 */

import { prisma } from "../src/lib/prisma";

async function checkPlatformPosts(campaignId: string) {
  try {
    console.log(`\n🔍 Checking platform posts for campaign: ${campaignId}\n`);

    const campaign = await prisma.campaignPlanner.findUnique({
      where: { id: campaignId },
      include: {
        project: {
          include: {
            projectToOAuthProviders: {
              include: {
                oauthProvider: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      console.log(`❌ Campaign not found\n`);
      return;
    }

    // Get all platform posts for this campaign
    const allPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: campaign.projectId,
      },
      include: {
        oauthProvider: true,
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

    if (platformPosts.length === 0) {
      console.log("❌ No platform posts found\n");
      return;
    }

    const now = new Date();
    console.log(`⏰ Current time: ${now.toISOString()}\n`);

    // Group by status
    const byStatus = platformPosts.reduce((acc, post) => {
      acc[post.status] = (acc[post.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("📊 Status Summary:");
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });

    // Check pending posts
    const pendingPosts = platformPosts.filter((post) => post.status === "pending");
    const pastDuePosts = pendingPosts.filter((post) => post.date <= now);
    const futurePosts = pendingPosts.filter((post) => post.date > now);

    console.log(`\n📋 Pending Posts Analysis:`);
    console.log(`   Total pending: ${pendingPosts.length}`);
    console.log(`   Past due: ${pastDuePosts.length}`);
    console.log(`   Future: ${futurePosts.length}`);

    if (pastDuePosts.length > 0) {
      console.log(`\n⚠️  PAST DUE POSTS (should have been posted):\n`);
      pastDuePosts.forEach((post, idx) => {
        const meta = post.meta as any;
        const minutesAgo = Math.round((now.getTime() - post.date.getTime()) / 1000 / 60);
        const hasOAuth = !!post.oauthProvider;
        
        console.log(`   ${idx + 1}. Post ${post.id.substring(0, 12)}...`);
        console.log(`      Platform: ${post.platform}`);
        console.log(`      Date: ${post.date.toISOString()}`);
        console.log(`      Status: ${post.status}`);
        console.log(`      Due: ${minutesAgo} minutes ago`);
        console.log(`      OAuth Provider: ${hasOAuth ? "✅ Connected" : "❌ NOT CONNECTED"}`);
        if (post.oauthProvider) {
          const hasToken = !!post.oauthProvider.accessToken;
          console.log(`      Access Token: ${hasToken ? "✅ Present" : "❌ Missing"}`);
          if (post.oauthProvider.expiresAt) {
            const expiresAt = new Date(post.oauthProvider.expiresAt * 1000);
            if (expiresAt < now) {
              console.log(`      ⚠️  Token expired: ${expiresAt.toISOString()}`);
            }
          }
        }
        if (post.error) {
          console.log(`      Error: ${post.error}`);
        }
        console.log(`      Day: ${meta?.day || "N/A"}`);
        console.log("");
      });
    }

    // Check failed posts
    const failedPosts = platformPosts.filter((post) => post.status === "failed");
    if (failedPosts.length > 0) {
      console.log(`\n❌ FAILED POSTS:\n`);
      failedPosts.slice(0, 10).forEach((post, idx) => {
        const meta = post.meta as any;
        console.log(`   ${idx + 1}. Post ${post.id.substring(0, 12)}... (${post.platform})`);
        console.log(`      Date: ${post.date.toISOString()}`);
        console.log(`      Error: ${post.error || "Unknown error"}`);
        console.log(`      Day: ${meta?.day || "N/A"}`);
        console.log("");
      });
    }

    // Check what the cron job would find
    console.log(`\n🔍 Cron Job Query Analysis:`);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const cronQueryPosts = platformPosts.filter((post) => {
      return post.status === "pending" && post.date <= oneHourFromNow;
    });
    const cronPastDue = cronQueryPosts.filter((post) => post.date <= now);

    console.log(`   Cron would find: ${cronQueryPosts.length} posts (date <= ${oneHourFromNow.toISOString()})`);
    console.log(`   Past due: ${cronPastDue.length} posts`);

    if (cronPastDue.length > 0) {
      console.log(`\n   Posts that should be processed by cron:\n`);
      cronPastDue.slice(0, 5).forEach((post) => {
        const minutesAgo = Math.round((now.getTime() - post.date.getTime()) / 1000 / 60);
        console.log(`     ${post.platform}: ${minutesAgo} minutes ago (${post.id.substring(0, 12)}...)`);
      });
    }

    // Check OAuth providers
    console.log(`\n🔐 OAuth Provider Check:`);
    const platforms = [...new Set(platformPosts.map((p) => p.platform))];
    platforms.forEach((platform) => {
      const postsForPlatform = platformPosts.filter((p) => p.platform === platform);
      const postsWithOAuth = postsForPlatform.filter((p) => !!p.oauthProvider);
      const postsWithoutOAuth = postsForPlatform.filter((p) => !p.oauthProvider);

      console.log(`   ${platform}:`);
      console.log(`     Total posts: ${postsForPlatform.length}`);
      console.log(`     With OAuth: ${postsWithOAuth.length}`);
      if (postsWithoutOAuth.length > 0) {
        console.log(`     ⚠️  Without OAuth: ${postsWithoutOAuth.length}`);
      }
    });

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

const campaignId = process.argv[2] || "6935eb173226eb6d27806646";
checkPlatformPosts(campaignId);
