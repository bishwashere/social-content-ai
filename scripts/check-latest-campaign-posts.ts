/**
 * Check the latest campaign's posts in detail
 */

import { prisma } from "../src/lib/prisma";

async function checkLatestCampaign() {
  try {
    const campaignId = "6962dea053e359ba46a1c407"; // Jan blog push
    
    console.log(`\n🔍 Checking latest campaign: ${campaignId}\n`);

    // Get campaign
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
      console.log("❌ Campaign not found\n");
      return;
    }

    console.log(`Campaign: ${campaign.name}`);
    console.log(`Start Date: ${campaign.startDate?.toISOString()}`);
    console.log(`Project ID: ${campaign.projectId}\n`);

    // Get ALL scheduled posts for this project
    const allPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: campaign.projectId,
      },
      include: {
        oauthProvider: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    console.log(`Total scheduled posts for project: ${allPosts.length}\n`);

    // Find webhook posts for this campaign
    const webhookPosts = allPosts.filter((post) => {
      const meta = post.meta as any;
      return (
        post.platform === "webhook" &&
        meta?.type === "blog-news" &&
        meta?.campaignId === campaignId
      );
    });

    console.log(`📋 Webhook Posts (Blog News): ${webhookPosts.length}\n`);
    webhookPosts.slice(0, 3).forEach((post, idx) => {
      const meta = post.meta as any;
      console.log(`   ${idx + 1}. Post ${post.id.substring(0, 12)}...`);
      console.log(`      Date: ${post.date.toISOString()}`);
      console.log(`      Status: ${post.status}`);
      console.log(`      Day: ${meta?.day || "N/A"}`);
      console.log(`      Step 4 Completed: ${meta?.step4Completed ? "✅" : "❌"}`);
      console.log("");
    });

    // Find platform posts for this campaign - check by blogNewsPostId
    const webhookPostIds = webhookPosts.map((p) => p.id);
    
    const platformPosts = allPosts.filter((post) => {
      if (post.platform === "webhook") return false;
      const meta = post.meta as any;
      
      // Check if this post was created from one of our webhook posts
      if (meta?.blogNewsPostId && webhookPostIds.includes(meta.blogNewsPostId)) {
        return true;
      }
      
      // Also check by campaignId and source
      if (meta?.campaignId === campaignId && meta?.source === "blog-news") {
        return true;
      }
      
      return false;
    });

    console.log(`📋 Platform Posts: ${platformPosts.length}\n`);

    if (platformPosts.length === 0) {
      console.log("❌ NO PLATFORM POSTS FOUND!\n");
      console.log("This means Step 4 didn't create platform posts.\n");
      
      // Check if Step 4 completed
      const step4Completed = webhookPosts.filter((post) => {
        const meta = post.meta as any;
        return meta?.step4Completed === true;
      });
      
      console.log(`Webhook posts with Step 4 completed: ${step4Completed.length} / ${webhookPosts.length}\n`);
      
      if (step4Completed.length === 0) {
        console.log("⚠️  Step 4 was never completed for any webhook post\n");
      } else {
        step4Completed.forEach((post) => {
          const meta = post.meta as any;
          console.log(`   Post ${post.id.substring(0, 12)}... (Day ${meta?.day}):`);
          console.log(`     Step 4 Completed: ✅`);
          console.log(`     Article URL: ${meta?.articleUrl || "NONE"}`);
          console.log(`     Platforms: ${meta?.platforms?.join(", ") || "NONE"}`);
          console.log(`     Platform Posts Result: ${JSON.stringify(meta?.platformPosts || [])}`);
          console.log("");
        });
      }
    } else {
      console.log("Platform posts found:\n");
      
      // Group by status
      const byStatus = platformPosts.reduce((acc, post) => {
        acc[post.status] = (acc[post.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      // Show recent posts
      const recentPosts = platformPosts.slice(0, 5);
      console.log(`\n   Recent posts:\n`);
      recentPosts.forEach((post, idx) => {
        const meta = post.meta as any;
        const now = new Date();
        const isPastDue = post.date <= now && post.status === "pending";
        
        console.log(`   ${idx + 1}. Post ${post.id.substring(0, 12)}... (${post.platform})`);
        console.log(`      Date: ${post.date.toISOString()}`);
        console.log(`      Status: ${post.status} ${isPastDue ? "⚠️ PAST DUE" : ""}`);
        console.log(`      Day: ${meta?.day || "N/A"}`);
        console.log(`      OAuth: ${post.oauthProvider ? "✅" : "❌"}`);
        if (post.error) {
          console.log(`      Error: ${post.error}`);
        }
        console.log("");
      });

      // Check tracking
      const trackingRecords = await prisma.projectTracking.findMany({
        where: {
          projectId: campaign.projectId,
          date: {
            gte: platformPosts[platformPosts.length - 1]?.date || new Date(0),
          },
        },
      });

      console.log(`\n   Tracking Records: ${trackingRecords.length}`);
      if (trackingRecords.length === 0) {
        console.log(`   ⚠️  NO TRACKING RECORDS - Posts may not have been actually posted\n`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestCampaign();
