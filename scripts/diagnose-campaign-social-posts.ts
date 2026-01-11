/**
 * Comprehensive diagnostic script for campaign social media posts
 * 
 * Usage:
 *   pnpm tsx scripts/diagnose-campaign-social-posts.ts <campaignId>
 * 
 * Example:
 *   pnpm tsx scripts/diagnose-campaign-social-posts.ts 688d0a4451cf105b4c13d0c8
 */

import { prisma } from "../src/lib/prisma";

async function diagnoseCampaign(campaignId: string) {
  try {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`🔍 DIAGNOSING CAMPAIGN: ${campaignId}`);
    console.log(`${"=".repeat(80)}\n`);

    // 1. Check Campaign Setup
    console.log("📋 STEP 1: Checking Campaign Setup");
    console.log("-".repeat(80));
    const campaign = await prisma.campaignPlanner.findUnique({
      where: { id: campaignId },
      include: {
        chats: true,
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
      console.log(`❌ Campaign not found: ${campaignId}\n`);
      return;
    }

    console.log(`✅ Campaign found: ${campaign.name || "Unnamed"}`);
    console.log(`   Goal: ${campaign.goal}`);
    console.log(`   Start Date: ${campaign.startDate?.toISOString() || "NOT SET"}`);
    console.log(`   Auto Post Enabled: ${campaign.autoPostEnabled}`);
    console.log(`   Auto Post Time: ${campaign.autoPostTime || "NOT SET"}`);
    console.log(`   Auto Post Platforms: ${campaign.autoPostPlatforms.join(", ") || "NONE"}`);

    const metadata = campaign.blogNewsMetadata as any;
    if (metadata) {
      console.log(`   Blog News Metadata:`);
      console.log(`     Topics: ${metadata.topics?.join(", ") || "NONE"}`);
      console.log(`     Angles: ${metadata.angles?.join(", ") || "NONE"}`);
      console.log(`     Webhook: ${metadata.webhook ? "SET" : "NOT SET"}`);
      console.log(`     Platforms: ${metadata.platforms?.join(", ") || "NONE"}`);
      console.log(`     Timezone: ${metadata.timezone || "NOT SET"}`);
    }

    console.log(`\n   Project ID: ${campaign.projectId}`);
    console.log(`   Connected OAuth Providers:`);
    const connectedPlatforms = campaign.project?.projectToOAuthProviders.map(
      (pto) => pto.oauthProvider?.platform
    ) || [];
    console.log(`     ${connectedPlatforms.length > 0 ? connectedPlatforms.join(", ") : "NONE"}`);

    // 2. Check Webhook Scheduled Posts (Step 1-4 posts)
    console.log(`\n📋 STEP 2: Checking Webhook Scheduled Posts (Blog News Posts)`);
    console.log("-".repeat(80));
    
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
        createdAt: true,
        updatedAt: true,
        processedAt: true,
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

    console.log(`✅ Found ${webhookPosts.length} webhook scheduled posts\n`);

    webhookPosts.forEach((post, idx) => {
      const meta = post.meta as any;
      console.log(`   Post ${idx + 1}:`);
      console.log(`     ID: ${post.id}`);
      console.log(`     Date: ${post.date.toISOString()}`);
      console.log(`     Status: ${post.status}`);
      console.log(`     Day: ${meta?.day || "N/A"}`);
      console.log(`     Step 1 Completed: ${meta?.step1Completed ? "✅" : "❌"}`);
      console.log(`     Step 2 Completed: ${meta?.step2Completed ? "✅" : "❌"}`);
      console.log(`     Step 3 Completed: ${meta?.step3Completed ? "✅" : "❌"}`);
      console.log(`     Step 4 Completed: ${meta?.step4Completed ? "✅" : "❌"}`);
      console.log(`     Article URL: ${meta?.articleUrl || "NONE"}`);
      console.log(`     Webhook Sent: ${meta?.webhookSent ? "✅" : "❌"}`);
      if (post.error) {
        console.log(`     Error: ${post.error}`);
      }
      console.log("");
    });

    // 3. Check Platform Posts (Created in Step 4)
    console.log(`\n📋 STEP 3: Checking Platform Posts (Social Media Posts)`);
    console.log("-".repeat(80));

    const platformPosts = allScheduledPosts.filter((post) => {
      const meta = post.meta as any;
      return (
        post.platform !== "webhook" &&
        (meta?.blogNewsPostId || 
         (meta?.campaignId === campaignId && meta?.source === "blog-news"))
      );
    });

    console.log(`✅ Found ${platformPosts.length} platform posts\n`);

    if (platformPosts.length === 0) {
      console.log(`❌ NO PLATFORM POSTS FOUND!`);
      console.log(`\n   This means Step 4 either:`);
      console.log(`   1. Didn't run (check Step 4 completion above)`);
      console.log(`   2. Failed silently (check Step 4 errors)`);
      console.log(`   3. Skipped due to missing articleUrl`);
      console.log(`   4. Skipped due to no platforms specified`);
      console.log(`   5. Failed due to missing OAuth providers\n`);
    } else {
      // Group by platform
      const byPlatform = platformPosts.reduce((acc, post) => {
        const platform = post.platform;
        if (!acc[platform]) {
          acc[platform] = [];
        }
        acc[platform].push(post);
        return acc;
      }, {} as Record<string, typeof platformPosts>);

      Object.entries(byPlatform).forEach(([platform, posts]) => {
        console.log(`   ${platform.toUpperCase()}: ${posts.length} posts`);
        const byStatus = posts.reduce((acc, post) => {
          acc[post.status] = (acc[post.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        Object.entries(byStatus).forEach(([status, count]) => {
          console.log(`     ${status}: ${count}`);
        });

        // Check if OAuth provider is connected
        const hasOAuth = connectedPlatforms.includes(platform);
        if (!hasOAuth) {
          console.log(`     ⚠️  WARNING: No OAuth provider connected for ${platform}`);
        }

        // Show sample posts
        const samplePosts = posts.slice(0, 3);
        samplePosts.forEach((post, idx) => {
          const meta = post.meta as any;
          console.log(`\n     Post ${idx + 1}:`);
          console.log(`       ID: ${post.id}`);
          console.log(`       Date: ${post.date.toISOString()}`);
          console.log(`       Status: ${post.status}`);
          console.log(`       Day: ${meta?.day || "N/A"}`);
          if (post.error) {
            console.log(`       Error: ${post.error}`);
          }
          if (post.date > new Date()) {
            const minutesUntil = Math.round((post.date.getTime() - Date.now()) / 1000 / 60);
            console.log(`       ⏰ Scheduled in ${minutesUntil} minutes`);
          } else {
            const minutesAgo = Math.round((Date.now() - post.date.getTime()) / 1000 / 60);
            console.log(`       ⏰ Was due ${minutesAgo} minutes ago`);
          }
        });
        console.log("");
      });
    }

    // 4. Check OAuth Providers for Each Platform
    console.log(`\n📋 STEP 4: Checking OAuth Provider Requirements`);
    console.log("-".repeat(80));

    const requiredPlatforms = metadata?.platforms || campaign.autoPostPlatforms || [];
    console.log(`Required platforms: ${requiredPlatforms.join(", ") || "NONE"}\n`);

    requiredPlatforms.forEach((platform: string) => {
      const normalizedPlatform = platform === "x" ? "twitter" : platform;
      const hasOAuth = connectedPlatforms.includes(normalizedPlatform);
      
      if (hasOAuth) {
        const provider = campaign.project?.projectToOAuthProviders.find(
          (pto) => pto.oauthProvider?.platform === normalizedPlatform
        );
        console.log(`   ${normalizedPlatform}: ✅ Connected`);
        if (provider?.oauthProvider) {
          const hasToken = !!provider.oauthProvider.accessToken;
          const expiresAt = provider.oauthProvider.expiresAt 
            ? new Date(provider.oauthProvider.expiresAt * 1000)
            : null;
          console.log(`     Access Token: ${hasToken ? "✅ Present" : "❌ Missing"}`);
          if (expiresAt) {
            const now = new Date();
            if (expiresAt < now) {
              console.log(`     ⚠️  Token expired: ${expiresAt.toISOString()}`);
            } else {
              const daysUntil = Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60 / 24);
              console.log(`     Token expires: ${expiresAt.toISOString()} (${daysUntil} days)`);
            }
          }
        }
      } else {
        console.log(`   ${normalizedPlatform}: ❌ NOT CONNECTED`);
        console.log(`     ⚠️  This platform will fail when trying to create posts in Step 4`);
      }
    });

    // 5. Check Why Platform Posts Aren't Being Posted
    console.log(`\n📋 STEP 5: Analyzing Why Posts Aren't Being Posted`);
    console.log("-".repeat(80));

    if (platformPosts.length === 0) {
      console.log(`\n❌ ROOT CAUSE: No platform posts were created in Step 4\n`);
      
      // Check Step 4 completion
      const completedStep4 = webhookPosts.filter((post) => {
        const meta = post.meta as any;
        return meta?.step4Completed === true;
      });

      if (completedStep4.length === 0) {
        console.log(`   Step 4 was never completed for any webhook post`);
        console.log(`   Check Step 3 completion and articleUrl above\n`);
      } else {
        console.log(`   Step 4 was completed for ${completedStep4.length} webhook posts`);
        console.log(`   But no platform posts were created. Possible reasons:\n`);
        
        completedStep4.forEach((post) => {
          const meta = post.meta as any;
          console.log(`   Webhook Post ${post.id}:`);
          console.log(`     Article URL: ${meta?.articleUrl || "MISSING"}`);
          console.log(`     Platforms: ${meta?.platforms?.join(", ") || "NONE"}`);
          console.log(`     Step 4 Platform Posts: ${JSON.stringify(meta?.platformPosts || [])}`);
          
          if (!meta?.articleUrl) {
            console.log(`     ❌ Missing articleUrl - Step 4 skips platform posts`);
          }
          if (!meta?.platforms || meta.platforms.length === 0) {
            console.log(`     ❌ No platforms specified - Step 4 skips platform posts`);
          }
          if (meta?.platformPosts) {
            const failedPlatforms = (meta.platformPosts as any[]).filter((p: any) => !p.success);
            if (failedPlatforms.length > 0) {
              console.log(`     ❌ Failed platforms: ${failedPlatforms.map((p: any) => `${p.platform}: ${p.error}`).join(", ")}`);
            }
          }
          console.log("");
        });
      }
    } else {
      // Check pending posts
      const pendingPosts = platformPosts.filter((post) => post.status === "pending");
      const pastDuePosts = pendingPosts.filter((post) => post.date <= new Date());

      console.log(`\n   Total platform posts: ${platformPosts.length}`);
      console.log(`   Pending posts: ${pendingPosts.length}`);
      console.log(`   Past due posts: ${pastDuePosts.length}\n`);

      if (pastDuePosts.length > 0) {
        console.log(`   ⚠️  Found ${pastDuePosts.length} posts that should have been posted but are still pending\n`);
        
        // Check OAuth for each past due post
        pastDuePosts.forEach((post) => {
          const hasOAuth = connectedPlatforms.includes(post.platform);
          console.log(`   Post ${post.id.substring(0, 12)}... (${post.platform}):`);
          console.log(`     Date: ${post.date.toISOString()}`);
          console.log(`     Status: ${post.status}`);
          console.log(`     OAuth Provider: ${hasOAuth ? "✅ Connected" : "❌ NOT CONNECTED"}`);
          if (post.error) {
            console.log(`     Error: ${post.error}`);
          }
          console.log("");
        });
      } else if (pendingPosts.length > 0) {
        const futurePosts = pendingPosts.filter((post) => post.date > new Date());
        console.log(`   All pending posts are scheduled for the future (${futurePosts.length} posts)`);
        futurePosts.slice(0, 3).forEach((post) => {
          const minutesUntil = Math.round((post.date.getTime() - Date.now()) / 1000 / 60);
          console.log(`     ${post.platform}: ${minutesUntil} minutes until posting`);
        });
      } else {
        // Check failed posts
        const failedPosts = platformPosts.filter((post) => post.status === "failed");
        if (failedPosts.length > 0) {
          console.log(`   ⚠️  Found ${failedPosts.length} failed posts\n`);
          failedPosts.slice(0, 5).forEach((post) => {
            console.log(`   Post ${post.id.substring(0, 12)}... (${post.platform}):`);
            console.log(`     Error: ${post.error || "Unknown error"}`);
            console.log("");
          });
        }
      }
    }

    // 6. Summary
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📊 SUMMARY`);
    console.log(`${"=".repeat(80)}\n`);

    const issues: string[] = [];

    if (webhookPosts.length === 0) {
      issues.push("❌ No webhook posts found - campaign may not have been scheduled");
    }

    const incompleteSteps = webhookPosts.filter((post) => {
      const meta = post.meta as any;
      return !meta?.step4Completed;
    });
    if (incompleteSteps.length > 0) {
      issues.push(`⚠️  ${incompleteSteps.length} webhook posts haven't completed Step 4`);
    }

    if (platformPosts.length === 0) {
      issues.push("❌ No platform posts were created - Step 4 likely failed or was skipped");
    }

    const missingOAuth = requiredPlatforms.filter((platform: string) => {
      const normalizedPlatform = platform === "x" ? "twitter" : platform;
      return !connectedPlatforms.includes(normalizedPlatform);
    });
    if (missingOAuth.length > 0) {
      issues.push(`❌ Missing OAuth providers for: ${missingOAuth.join(", ")}`);
    }

    const pastDuePending = platformPosts.filter(
      (post) => post.status === "pending" && post.date <= new Date()
    );
    if (pastDuePending.length > 0) {
      issues.push(`⚠️  ${pastDuePending.length} platform posts are past due but still pending`);
    }

    if (issues.length === 0) {
      console.log("✅ No issues found! All checks passed.\n");
    } else {
      console.log("Issues found:\n");
      issues.forEach((issue) => console.log(`  ${issue}`));
      console.log("");
    }

  } catch (error) {
    console.error("❌ Error diagnosing campaign:", error);
    if (error instanceof Error) {
      console.error("Stack trace:", error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Get campaign ID from command line
const campaignId = process.argv[2];

if (!campaignId) {
  console.error("❌ Please provide a campaign ID");
  console.error("Usage: pnpm tsx scripts/diagnose-campaign-social-posts.ts <campaignId>");
  process.exit(1);
}

diagnoseCampaign(campaignId);
