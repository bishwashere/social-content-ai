/**
 * Check campaigns for a project
 */

import { prisma } from "../src/lib/prisma";

async function checkProject(projectId: string) {
  try {
    console.log(`\n🔍 Checking project: ${projectId}\n`);

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        campaignPlanners: {
          where: {
            goal: "Blog News",
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        projectToOAuthProviders: {
          include: {
            oauthProvider: true,
          },
        },
      },
    });

    if (!project) {
      console.log(`❌ Project not found: ${projectId}\n`);
      return;
    }

    console.log(`✅ Project found: ${project.name || "Unnamed"}`);
    console.log(`   Blog News Campaigns: ${project.campaignPlanners.length}\n`);

    if (project.campaignPlanners.length === 0) {
      console.log("No Blog News campaigns found for this project.\n");
      return;
    }

    // Check each campaign
    for (const campaign of project.campaignPlanners) {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`📋 Campaign: ${campaign.name || "Unnamed"} (${campaign.id})`);
      console.log(`${"=".repeat(80)}\n`);

      // Run diagnosis for this campaign
      await diagnoseCampaign(campaign.id, project);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

async function diagnoseCampaign(campaignId: string, project: any) {
  const campaign = await prisma.campaignPlanner.findUnique({
    where: { id: campaignId },
    include: {
      chats: true,
    },
  });

  if (!campaign) return;

  console.log(`   Goal: ${campaign.goal}`);
  console.log(`   Start Date: ${campaign.startDate?.toISOString() || "NOT SET"}`);
  console.log(`   Auto Post Enabled: ${campaign.autoPostEnabled}`);
  console.log(`   Auto Post Time: ${campaign.autoPostTime || "NOT SET"}`);

  const metadata = campaign.blogNewsMetadata as any;
  if (metadata) {
    console.log(`   Platforms: ${metadata.platforms?.join(", ") || "NONE"}`);
    console.log(`   Webhook: ${metadata.webhook ? "SET" : "NOT SET"}`);
  }

  // Check scheduled posts
  const allScheduledPosts = await prisma.scheduledPost.findMany({
    where: {
      projectId: campaign.projectId,
    },
    select: {
      id: true,
      platform: true,
      date: true,
      status: true,
      error: true,
      meta: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  const webhookPosts = allScheduledPosts.filter((post) => {
    const meta = post.meta as any;
    return (
      post.platform === "webhook" &&
      meta?.type === "blog-news" &&
      meta?.campaignId === campaignId
    );
  });

  console.log(`\n   Webhook Posts: ${webhookPosts.length}`);

  if (webhookPosts.length > 0) {
    const latestPost = webhookPosts[webhookPosts.length - 1];
    const meta = latestPost.meta as any;
    console.log(`   Latest Post Status: ${latestPost.status}`);
    console.log(`   Step 1: ${meta?.step1Completed ? "✅" : "❌"}`);
    console.log(`   Step 2: ${meta?.step2Completed ? "✅" : "❌"}`);
    console.log(`   Step 3: ${meta?.step3Completed ? "✅" : "❌"}`);
    console.log(`   Step 4: ${meta?.step4Completed ? "✅" : "❌"}`);
    console.log(`   Article URL: ${meta?.articleUrl || "NONE"}`);
  }

  // Check platform posts
  const platformPosts = allScheduledPosts.filter((post) => {
    const meta = post.meta as any;
    return (
      post.platform !== "webhook" &&
      (meta?.blogNewsPostId || 
       (meta?.campaignId === campaignId && meta?.source === "blog-news"))
    );
  });

  console.log(`\n   Platform Posts: ${platformPosts.length}`);

  if (platformPosts.length > 0) {
    const byPlatform = platformPosts.reduce((acc, post) => {
      acc[post.platform] = (acc[post.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(byPlatform).forEach(([platform, count]) => {
      const hasOAuth = project.projectToOAuthProviders.some(
        (pto: any) => pto.oauthProvider?.platform === platform
      );
      console.log(`     ${platform}: ${count} posts ${hasOAuth ? "✅" : "❌ (No OAuth)"}`);
    });

    const pendingPastDue = platformPosts.filter(
      (post) => post.status === "pending" && post.date <= new Date()
    );
    if (pendingPastDue.length > 0) {
      console.log(`\n   ⚠️  ${pendingPastDue.length} posts are past due but still pending`);
    }
  } else {
    console.log(`\n   ❌ NO PLATFORM POSTS CREATED`);
  }

  // Check OAuth providers
  const requiredPlatforms = metadata?.platforms || [];
  const connectedPlatforms = project.projectToOAuthProviders.map(
    (pto: any) => pto.oauthProvider?.platform
  ).filter(Boolean);

  console.log(`\n   OAuth Providers:`);
  requiredPlatforms.forEach((platform: string) => {
    const normalizedPlatform = platform === "x" ? "twitter" : platform;
    const hasOAuth = connectedPlatforms.includes(normalizedPlatform);
    console.log(`     ${normalizedPlatform}: ${hasOAuth ? "✅" : "❌ NOT CONNECTED"}`);
  });
}

const projectId = process.argv[2] || "688d0a4451cf105b4c13d0c8";
checkProject(projectId);
