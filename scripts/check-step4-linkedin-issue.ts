/**
 * Diagnostic script to check why LinkedIn post wasn't created in Step 4
 * 
 * Usage: npx tsx scripts/check-step4-linkedin-issue.ts [postId]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkStep4LinkedInIssue(postId?: string) {
  try {
    console.log("\n🔍 Checking Step 4 LinkedIn Post Issue\n");

    // Find the webhook post
    let webhookPost;
    if (postId) {
      webhookPost = await prisma.scheduledPost.findUnique({
        where: { id: postId },
        select: {
          id: true,
          projectId: true,
          status: true,
          meta: true,
          date: true,
        },
      });
    } else {
      // Find most recent webhook post with Step 4 completed
      webhookPost = await prisma.scheduledPost.findFirst({
        where: {
          platform: "webhook",
          status: "success",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          projectId: true,
          status: true,
          meta: true,
          date: true,
        },
      });
    }

    if (!webhookPost) {
      console.log("❌ No webhook post found\n");
      return;
    }

    const meta = webhookPost.meta as any;
    console.log(`📋 Webhook Post ID: ${webhookPost.id}`);
    console.log(`   Project ID: ${webhookPost.projectId}`);
    console.log(`   Status: ${webhookPost.status}`);
    console.log(`   Step 4 Completed: ${meta?.step4Completed ? "✅" : "❌"}`);
    console.log(`   Scheduled For: ${new Date(webhookPost.date).toLocaleString()}\n`);

    // Check Step 4 platform posts results
    const platformPosts = meta?.platformPosts || [];
    console.log(`📊 Step 4 Platform Posts Results:`);
    if (platformPosts.length === 0) {
      console.log("   ⚠️  No platform posts were attempted\n");
    } else {
      platformPosts.forEach((result: any) => {
        const status = result.success ? "✅" : "❌";
        console.log(`   ${status} ${result.platform}: ${result.success ? "Created" : result.error || "Failed"}`);
      });
      console.log();
    }

    // Check if LinkedIn was in the platforms list
    const platforms = meta?.platforms || [];
    console.log(`🎯 Platforms specified: ${platforms.join(", ")}`);
    const hasLinkedIn = platforms.includes("linkedin");
    console.log(`   LinkedIn included: ${hasLinkedIn ? "✅" : "❌"}\n`);

    if (!hasLinkedIn) {
      console.log("❌ ROOT CAUSE: LinkedIn was not in the platforms list for this campaign\n");
      return;
    }

    // Check if LinkedIn OAuth provider is connected
    console.log("🔐 Checking LinkedIn OAuth Provider...");
    const linkedinProvider = await prisma.projectToOAuthProvider.findFirst({
      where: {
        projectId: webhookPost.projectId,
        oauthProvider: {
          platform: "linkedin",
        },
      },
      include: {
        oauthProvider: true,
      },
    });

    if (!linkedinProvider) {
      console.log("   ❌ No LinkedIn OAuth provider mapped to this project");
      console.log("\n💡 SOLUTION: Connect LinkedIn account in project settings\n");
    } else {
      console.log("   ✅ LinkedIn OAuth provider found");
      console.log(`   Provider ID: ${linkedinProvider.oauthProviderId}`);
      console.log(`   User ID: ${linkedinProvider.oauthProvider.userId}`);
    }

    // Check if LinkedIn scheduled post exists
    console.log("\n📝 Checking for LinkedIn scheduled post...");
    const allLinkedinPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: webhookPost.projectId,
        platform: "linkedin",
      },
      select: {
        id: true,
        status: true,
        date: true,
        content: true,
        meta: true,
      },
    });

    const linkedinPost = allLinkedinPosts.find((p) => {
      const postMeta = p.meta as any;
      return postMeta?.blogNewsPostId === webhookPost.id;
    });

    if (linkedinPost) {
      console.log("   ✅ LinkedIn scheduled post exists!");
      console.log(`   Post ID: ${linkedinPost.id}`);
      console.log(`   Status: ${linkedinPost.status}`);
      console.log(`   Scheduled For: ${new Date(linkedinPost.date).toLocaleString()}`);
      console.log(`   Content Preview: ${linkedinPost.content.substring(0, 100)}...\n`);
    } else {
      console.log("   ❌ LinkedIn scheduled post NOT found\n");
      
      // Check Step 4 result for LinkedIn
      const linkedinResult = platformPosts.find((r: any) => r.platform === "linkedin");
      if (linkedinResult) {
        console.log("   Step 4 result for LinkedIn:");
        console.log(`   Success: ${linkedinResult.success}`);
        if (linkedinResult.error) {
          console.log(`   Error: ${linkedinResult.error}`);
        }
        console.log();
      }
    }

    // Summary
    console.log("\n📋 SUMMARY:");
    if (!linkedinProvider) {
      console.log("❌ LinkedIn OAuth provider not connected - this is why the post wasn't created");
      console.log("   Action: Connect LinkedIn account in project settings");
    } else if (!linkedinPost) {
      console.log("❌ LinkedIn post was not created despite OAuth being connected");
      const linkedinResult = platformPosts.find((r: any) => r.platform === "linkedin");
      if (linkedinResult && !linkedinResult.success) {
        console.log(`   Error: ${linkedinResult.error || "Unknown error"}`);
      } else {
        console.log("   Possible causes:");
        console.log("   - Step 4 code may not be deployed (check Next.js deployment)");
        console.log("   - Scheduled date was in the past (check logs)");
        console.log("   - Database error during creation");
      }
    } else {
      console.log("✅ LinkedIn post exists - check why it's not posting at scheduled time");
    }
    console.log();

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get postId from command line args
const postId = process.argv[2];
checkStep4LinkedInIssue(postId);
