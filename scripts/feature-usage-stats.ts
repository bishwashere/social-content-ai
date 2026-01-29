/**
 * Feature Usage Statistics
 * Shows what features users are using Next Post AI for
 * Usage: npx tsx scripts/feature-usage-stats.ts
 */

import { prisma } from "../src/lib/prisma";

async function getFeatureUsageStats() {
  try {
    console.log("\n🔍 Analyzing Feature Usage Statistics...\n");
    console.log("━".repeat(60));

    // 1. Total Users
    const totalUsers = await prisma.user.count();
    console.log(`\n👥 TOTAL USERS: ${totalUsers}`);

    // 2. Projects
    const totalProjects = await prisma.projects.count();
    console.log(`\n📁 TOTAL PROJECTS: ${totalProjects}`);

    // 3. Campaign Planners
    const totalCampaigns = await prisma.campaignPlanner.count();
    console.log(`\n📅 TOTAL CAMPAIGNS: ${totalCampaigns}`);

    // 4. Platform usage in campaigns
    console.log("\n" + "━".repeat(60));
    console.log("\n📊 PLATFORM USAGE IN CAMPAIGNS:");
    const campaigns = await prisma.campaignPlanner.findMany({
      select: {
        platforms: true,
        autoPostPlatforms: true,
        autoPostEnabled: true,
      },
    });

    const platformCounts: Record<string, number> = {};
    campaigns.forEach((campaign) => {
      const platforms =
        campaign.autoPostPlatforms.length > 0
          ? campaign.autoPostPlatforms
          : campaign.platforms;
      platforms.forEach((platform) => {
        platformCounts[platform] = (platformCounts[platform] || 0) + 1;
      });
    });

    const sortedPlatforms = Object.entries(platformCounts).sort(
      (a, b) => b[1] - a[1]
    );
    sortedPlatforms.forEach(([platform, count]) => {
      const percentage = ((count / totalCampaigns) * 100).toFixed(1);
      console.log(`   ${platform.padEnd(12)}: ${count} campaigns (${percentage}%)`);
    });

    // 5. Auto-post enabled campaigns
    const autoPostEnabled = campaigns.filter((c) => c.autoPostEnabled).length;
    console.log(
      `\n   🤖 Auto-post enabled: ${autoPostEnabled} campaigns (${((autoPostEnabled / totalCampaigns) * 100).toFixed(1)}%)`
    );

    // 6. Wall Posts (content shared publicly)
    console.log("\n" + "━".repeat(60));
    console.log("\n🧱 WALL POSTS (Public Content Shares):");
    const wallPosts = await prisma.wall.findMany({
      select: { platform: true },
    });
    const wallByPlatform: Record<string, number> = {};
    wallPosts.forEach((post) => {
      wallByPlatform[post.platform] = (wallByPlatform[post.platform] || 0) + 1;
    });
    console.log(`   Total wall posts: ${wallPosts.length}`);
    Object.entries(wallByPlatform)
      .sort((a, b) => b[1] - a[1])
      .forEach(([platform, count]) => {
        console.log(`   ${platform.padEnd(12)}: ${count} posts`);
      });

    // 7. Scheduled Posts
    console.log("\n" + "━".repeat(60));
    console.log("\n⏰ SCHEDULED POSTS:");
    const scheduledPosts = await prisma.scheduledPost.findMany({
      select: { platform: true, status: true },
    });
    const scheduledByPlatform: Record<string, number> = {};
    const scheduledByStatus: Record<string, number> = {};
    scheduledPosts.forEach((post) => {
      scheduledByPlatform[post.platform] =
        (scheduledByPlatform[post.platform] || 0) + 1;
      scheduledByStatus[post.status] =
        (scheduledByStatus[post.status] || 0) + 1;
    });
    console.log(`   Total scheduled posts: ${scheduledPosts.length}`);
    console.log("\n   By Platform:");
    Object.entries(scheduledByPlatform)
      .sort((a, b) => b[1] - a[1])
      .forEach(([platform, count]) => {
        console.log(`   ${platform.padEnd(12)}: ${count} posts`);
      });
    console.log("\n   By Status:");
    Object.entries(scheduledByStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`   ${status.padEnd(12)}: ${count} posts`);
      });

    // 8. Project Chats (AI content generation sessions)
    console.log("\n" + "━".repeat(60));
    console.log("\n💬 PROJECT CHATS (AI Content Generation Sessions):");
    const projectChats = await prisma.projectChat.count();
    console.log(`   Total project chats: ${projectChats}`);

    // 9. Campaign Chats (daily AI-generated content)
    console.log("\n" + "━".repeat(60));
    console.log("\n📝 CAMPAIGN CHATS (Daily AI-Generated Content):");
    const campaignChats = await prisma.campaignChat.count();
    const completedCampaignChats = await prisma.campaignChat.count({
      where: { completed: true },
    });
    console.log(`   Total campaign chats: ${campaignChats}`);
    console.log(`   Completed: ${completedCampaignChats}`);
    console.log(
      `   Completion rate: ${((completedCampaignChats / campaignChats) * 100).toFixed(1)}%`
    );

    // 10. OAuth Providers (Connected Accounts)
    console.log("\n" + "━".repeat(60));
    console.log("\n🔗 CONNECTED SOCIAL ACCOUNTS:");
    const oauthProviders = await prisma.oauthProvider.findMany({
      select: { platform: true },
    });
    const oauthByPlatform: Record<string, number> = {};
    oauthProviders.forEach((provider) => {
      oauthByPlatform[provider.platform] =
        (oauthByPlatform[provider.platform] || 0) + 1;
    });
    console.log(`   Total connected accounts: ${oauthProviders.length}`);
    Object.entries(oauthByPlatform)
      .sort((a, b) => b[1] - a[1])
      .forEach(([platform, count]) => {
        console.log(`   ${platform.padEnd(12)}: ${count} accounts`);
      });

    // 11. Video Uploads
    console.log("\n" + "━".repeat(60));
    console.log("\n🎥 VIDEO UPLOADS:");
    const uploadedVideos = await prisma.uploadedVideo.count();
    const publishedVideos = await prisma.uploadedVideo.count({
      where: { isPublised: true },
    });
    console.log(`   Total uploaded videos: ${uploadedVideos}`);
    console.log(`   Published videos: ${publishedVideos}`);

    // 12. Subscriptions
    console.log("\n" + "━".repeat(60));
    console.log("\n💳 SUBSCRIPTIONS:");
    const subscriptions = await prisma.subscription.findMany({
      select: { status: true, active: true },
    });
    const subsByStatus: Record<string, number> = {};
    subscriptions.forEach((sub) => {
      subsByStatus[sub.status] = (subsByStatus[sub.status] || 0) + 1;
    });
    console.log(`   Total subscriptions: ${subscriptions.length}`);
    const activeSubscriptions = subscriptions.filter((s) => s.active).length;
    console.log(`   Active subscriptions: ${activeSubscriptions}`);
    Object.entries(subsByStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`   ${status.padEnd(15)}: ${count}`);
      });

    // 13. Ideas (User-created content ideas)
    console.log("\n" + "━".repeat(60));
    console.log("\n💡 IDEAS:");
    const ideas = await prisma.idea.count();
    const publishedIdeas = await prisma.idea.count({
      where: { status: "published" },
    });
    console.log(`   Total ideas: ${ideas}`);
    console.log(`   Published ideas: ${publishedIdeas}`);

    // 14. Templates usage
    console.log("\n" + "━".repeat(60));
    console.log("\n📋 TEMPLATES:");
    const templates = await prisma.template.findMany({
      select: { category: true },
    });
    const templatesByCategory: Record<string, number> = {};
    templates.forEach((t) => {
      templatesByCategory[t.category] =
        (templatesByCategory[t.category] || 0) + 1;
    });
    console.log(`   Total templates: ${templates.length}`);
    Object.entries(templatesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   ${category.padEnd(20)}: ${count}`);
      });

    // 15. Project Folders
    console.log("\n" + "━".repeat(60));
    console.log("\n📂 PROJECT FOLDERS:");
    const projectFolders = await prisma.projectFolder.count();
    console.log(`   Total project folders: ${projectFolders}`);

    // 16. Referral Program
    console.log("\n" + "━".repeat(60));
    console.log("\n🎁 REFERRAL PROGRAM:");
    const referralPartners = await prisma.referralPartner.count();
    const referralClicks = await prisma.referralClick.count();
    const referralSignups = await prisma.referralSignup.count();
    console.log(`   Partners: ${referralPartners}`);
    console.log(`   Clicks: ${referralClicks}`);
    console.log(`   Signups: ${referralSignups}`);
    if (referralClicks > 0) {
      console.log(
        `   Conversion rate: ${((referralSignups / referralClicks) * 100).toFixed(1)}%`
      );
    }

    // Summary
    console.log("\n" + "━".repeat(60));
    console.log("\n📈 FEATURE USAGE SUMMARY:");
    console.log("━".repeat(60));

    const features = [
      { name: "Users", count: totalUsers },
      { name: "Projects", count: totalProjects },
      { name: "Campaigns", count: totalCampaigns },
      { name: "Campaign Chats (AI Content)", count: campaignChats },
      { name: "Project Chats", count: projectChats },
      { name: "Scheduled Posts", count: scheduledPosts.length },
      { name: "Wall Posts (Public)", count: wallPosts.length },
      { name: "Connected Accounts", count: oauthProviders.length },
      { name: "Video Uploads", count: uploadedVideos },
      { name: "Ideas", count: ideas },
      { name: "Project Folders", count: projectFolders },
    ];

    features
      .sort((a, b) => b.count - a.count)
      .forEach(({ name, count }) => {
        console.log(`   ${name.padEnd(30)}: ${count}`);
      });

    console.log("\n" + "━".repeat(60) + "\n");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

getFeatureUsageStats();
