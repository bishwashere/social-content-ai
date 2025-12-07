import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { checkAndRefreshTwitterToken } from "@/lib/twitter-auth";
import { getLinkedinTokensForUser } from "@/lib/auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { postToSocial } from "@/lib/post-to-social";
import { Linkedin } from "@/lib/3rd-providers/linkedin";
import { Fb } from "@/lib/3rd-providers/fb";
import { Threads } from "@/lib/3rd-providers/threads";
import { generateBlogNewsContent, generateSocialExcerpt } from "@/backend-apis/campaign-planner/blog-news";
import { schedulePost } from "@/server-actions/schedule-post";
import { logger } from "@/utils/logger";

export const dynamic = "force-dynamic";
// Increase timeout for blog generation (Vercel Pro allows up to 60s, Hobby is 10s)
export const maxDuration = 60; // 60 seconds for Pro plan, will be capped at 10s on Hobby plan

/**
 * Process pending scheduled posts
 */
export const GET = applyMiddleware(
  catchApiAsyncError(async () => {
    const now = new Date();
    console.log("🔍 Finding pending scheduled posts");
    console.log(`⏰ Current time (UTC): ${now.toISOString()}`);
    console.log(`⏰ Current time (local): ${now.toLocaleString()}`);
    console.log(`⏰ Current time (EST): ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })}`);
    
    // Query for pending posts
    // Use a slightly more lenient date range to account for potential timezone issues
    // Check for posts scheduled up to 1 hour in the future (to catch edge cases)
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    console.log(`⏰ Query range: up to ${oneHourFromNow.toISOString()}`);
    
    const pending = await prisma.scheduledPost.findMany({
      where: {
        status: "pending",
        date: {
          lte: oneHourFromNow, // Slightly more lenient to catch timezone edge cases
        },
      },
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
    
    // Filter in JavaScript to ensure we only process truly past-due posts
    const pendingPastDue = pending.filter(p => new Date(p.date) <= now);

    // Also query for "processing" webhook/blog-news posts that are past due
    // This includes:
    // 1. Posts ready for Steps 3 & 4 (step2Completed = true, recently updated by Python app)
    // 2. Stuck posts (haven't been updated in 10+ minutes - for recovery)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    
    // Query for processing webhook posts - include both fresh and stuck posts
    const processingWebhook = await prisma.scheduledPost.findMany({
      where: {
        status: "processing",
        platform: "webhook",
        date: {
          lte: oneHourFromNow, // Use same lenient range
        },
        // Include posts that are either:
        // - Recently updated (ready for Steps 3 & 4 after Python app completes Steps 1 & 2)
        // - Stuck (not updated in 10+ minutes, for recovery)
        OR: [
          {
            // Fresh posts: updated recently (Python app just completed Steps 1 & 2)
            updatedAt: {
              gte: tenMinutesAgo,
            },
          },
          {
            // Stuck posts: not updated in 10+ minutes (for recovery)
            updatedAt: {
              lte: tenMinutesAgo,
            },
          },
        ],
      },
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

    // Filter processing posts to only include blog-news type and truly past-due
    const processingBlogNews = processingWebhook.filter((p) => {
      const meta = p.meta as any;
      const isBlogNews = meta?.type === "blog-news";
      const isPastDue = new Date(p.date) <= now;
      return isBlogNews && isPastDue;
    });
    
    // STUCK RECOVERY: For each stuck post, determine which step to retry or mark as failed
    const stuckRecoveryResults = await Promise.all(
      processingBlogNews.map(async (post) => {
        const meta = post.meta as any;
        const lastStepCompleted = meta?.step4CompletedAt 
          ? "step4" 
          : meta?.step3CompletedAt 
          ? "step3" 
          : meta?.step2CompletedAt 
          ? "step2" 
          : meta?.step1CompletedAt 
          ? "step1" 
          : "none";
        
        logger.log(`[Stuck Recovery] Post ${post.id} stuck at step: ${lastStepCompleted}`);
        
        // If stuck for more than 30 minutes, mark as failed
        const updatedAt = new Date(post.updatedAt);
        const stuckDuration = now.getTime() - updatedAt.getTime();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (stuckDuration > thirtyMinutes) {
          logger.error(`[Stuck Recovery] Post ${post.id} stuck for ${Math.round(stuckDuration / 60000)} minutes, marking as failed`);
          await updatePostStatus(
            post.id,
            "failed",
            `Stuck in processing for more than 30 minutes. Last completed step: ${lastStepCompleted}`
          );
          return { id: post.id, action: "marked_failed", reason: "stuck_too_long" };
        }
        
        // Otherwise, try to retry the next step
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        
        let retryUrl = "";
        if (lastStepCompleted === "step1" && !meta?.step2Completed) {
          retryUrl = `${baseUrl}/api/blog/step-2-generate`;
        } else if (lastStepCompleted === "step2" && !meta?.step3Completed) {
          retryUrl = `${baseUrl}/api/blog/step-3-send-webhook`;
        } else if (lastStepCompleted === "step3" && !meta?.step4Completed) {
          retryUrl = `${baseUrl}/api/blog/step-4-finalize`;
        } else if (lastStepCompleted === "none" || !meta?.step1Completed) {
          retryUrl = `${baseUrl}/api/blog/step-1-fetch-article`;
        }
        
        if (retryUrl) {
          logger.log(`[Stuck Recovery] Retrying ${retryUrl} for post ${post.id}`);
          fetch(retryUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId: post.id }),
          }).catch((error) => {
            logger.error(`[Stuck Recovery] Failed to retry for post ${post.id}`, error);
          });
          return { id: post.id, action: "retried", step: lastStepCompleted };
        }
        
        return { id: post.id, action: "no_action", reason: "unknown_state" };
      })
    );
    
    logger.log(`[Stuck Recovery] Processed ${stuckRecoveryResults.length} stuck posts`);

    console.log(`📊 Found ${pending.length} pending posts (query), ${pendingPastDue.length} are past due`);
    logger.log(`📊 Found ${processingBlogNews.length} processing blog-news posts (stuck)`);
    
    // Combine pending and stuck processing posts
    const allPostsToProcess = [...pendingPastDue, ...processingBlogNews];
    
    // Separate Blog News posts from regular posts
    const blogNewsPosts = allPostsToProcess.filter((p) => {
      const meta = p.meta as any;
      return p.platform === "webhook" || meta?.type === "blog-news";
    });
    
    const regularPosts = allPostsToProcess.filter((p) => {
      const meta = p.meta as any;
      return p.platform !== "webhook" && meta?.type !== "blog-news";
    });
    
    const twitterPosts = regularPosts.filter((p) => p.platform === "twitter");
    const facebookPosts = regularPosts.filter((p) => p.platform === "facebook");
    const linkedinPosts = regularPosts.filter((p) => p.platform === "linkedin");
    const threadsPosts = regularPosts.filter((p) => p.platform === "threads");
    const redditPosts = regularPosts.filter((p) => p.platform === "reddit");
    
    console.log(`📰 Found ${blogNewsPosts.length} Blog News posts to process`);
    console.log(`🐦 Found ${twitterPosts.length} Twitter posts to process`);
    console.log(`📘 Found ${facebookPosts.length} Facebook posts to process`);
    console.log(`📘 Found ${linkedinPosts.length} Linkedin posts to process`);
    console.log(`🧵 Found ${threadsPosts.length} Threads posts to process`);
    console.log(`📘 Found ${redditPosts.length} Reddit posts to process`);
    
    // Debug: Log sample of posts that should be processed
    if (allPostsToProcess.length > 0) {
      console.log(`\n🔍 Sample of posts to process (first 3):`);
      allPostsToProcess.slice(0, 3).forEach((post, idx) => {
        const meta = post.meta as any;
        const postDate = new Date(post.date);
        const timeDiff = Math.round((now.getTime() - postDate.getTime()) / 1000 / 60);
        console.log(`   ${idx + 1}. ID: ${post.id.substring(0, 12)}..., Platform: ${post.platform}, Status: ${post.status}`);
        console.log(`      Date (ISO): ${post.date.toISOString()}, Date (Local): ${postDate.toLocaleString()}`);
        console.log(`      Time diff: ${timeDiff} minutes ${timeDiff >= 0 ? 'ago' : 'in future'}`);
        console.log(`      Campaign: ${meta?.campaignId || 'N/A'}, Day: ${meta?.day || 'N/A'}`);
      });
    } else {
      console.log(`\n⚠️  No posts found to process.`);
      // Lightweight check - only count, don't fetch
      const anyPending = await prisma.scheduledPost.count({
        where: { status: "pending" },
      });
      console.log(`   Total pending posts (any date): ${anyPending}`);
      
      if (anyPending > 0) {
        // Try a more lenient query - check posts from the last 24 hours
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const recentPending = await prisma.scheduledPost.findMany({
          where: {
            status: "pending",
            date: {
              gte: yesterday,
              lte: now,
            },
          },
          select: { id: true, date: true, platform: true, meta: true },
          take: 5,
        });
        
        if (recentPending.length > 0) {
          console.log(`   ⚠️  Found ${recentPending.length} pending posts in last 24h that should be processed`);
          recentPending.forEach((post, idx) => {
            const meta = post.meta as any;
            const postDate = new Date(post.date);
            const timeDiff = Math.round((now.getTime() - postDate.getTime()) / 1000 / 60);
            console.log(`      ${idx + 1}. Date: ${postDate.toISOString()} (${timeDiff} min ago), Platform: ${post.platform}, Campaign: ${meta?.campaignId || 'N/A'}`);
          });
        }
      }
    }

    // Process Blog News posts - Steps 3 & 4 (Python app handles Steps 1 & 2)
    // State Machine:
    // - pending/processing + step2Completed=false → Python app will handle (skip)
    // - processing + step2Completed=true + step3Completed=false → Trigger Step 3
    // - processing + step3Completed=true + step4Completed=false → Trigger Step 4
    // - success → Already complete (skip)
    // - error → Terminal error (skip, requires manual intervention)
    
    const blogNewsResults = await Promise.all(
      blogNewsPosts.map(async (post) => {
        console.log(`🔄 Processing Blog News post ID: ${post.id}`);
        const meta = post.meta as any;
        try {
          
          if (!meta || meta.type !== "blog-news") {
            await updatePostStatus(post.id, "failed", "Invalid Blog News metadata");
            return {
              id: post.id,
              success: false,
              error: "Invalid Blog News metadata",
            };
          }

          // IDEMPOTENCY CHECK: Skip if already processed (status is "success" or "posted")
          if (post.status === "success" || post.status === "posted") {
            console.log(`⏭️ Skipping Blog News post ID: ${post.id} - already processed`);
            return {
              id: post.id,
              success: true,
              message: "Already processed",
              skipped: true,
            };
          }

          // IDEMPOTENCY CHECK: Skip if in terminal error state
          if (post.status === "error") {
            console.log(`⏭️ Skipping Blog News post ID: ${post.id} - terminal error state (requires manual intervention)`);
            return {
              id: post.id,
              success: false,
              message: "Terminal error - requires manual intervention",
              skipped: true,
            };
          }

          // STATE CHECK: If Step 2 not completed, Python app will handle it
          if (!meta?.step2Completed || !meta?.blog) {
            console.log(`⏭️ Skipping Blog News post ID: ${post.id} - Step 2 not completed (Python app will handle)`);
            return {
              id: post.id,
              success: true,
              message: "Waiting for Python app to complete Steps 1 & 2",
              skipped: true,
            };
          }

          // STATE CHECK: Step 2 completed, check if Step 3 needs to run
          if (meta?.step2Completed && !meta?.step3Completed) {
            console.log(`🚀 Triggering Step 3 for Blog News post ID: ${post.id}`);
            
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
            const step3Url = `${baseUrl}/api/blog/step-3-send-webhook`;
            
            try {
              // Trigger Step 3 asynchronously (don't wait for completion)
              fetch(step3Url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: post.id }),
              }).catch((error) => {
                console.error(`❌ Failed to trigger Step 3 for post ${post.id}:`, error);
                updatePostStatus(post.id, "failed", `Failed to trigger Step 3: ${error instanceof Error ? error.message : "Unknown error"}`);
              });

              return {
                id: post.id,
                success: true,
                message: "Step 3 triggered - Webhook in progress",
                inProgress: true,
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              console.error(`❌ Error triggering Step 3 for post ${post.id}:`, error);
              await updatePostStatus(post.id, "failed", `Failed to trigger Step 3: ${errorMessage}`);
              
              return {
                id: post.id,
                success: false,
                error: `Failed to trigger Step 3: ${errorMessage}`,
              };
            }
          }

          // STATE CHECK: Step 3 completed, check if Step 4 needs to run
          if (meta?.step3Completed && !meta?.step4Completed) {
            console.log(`🚀 Triggering Step 4 for Blog News post ID: ${post.id}`);
            
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
            const step4Url = `${baseUrl}/api/blog/step-4-finalize`;
            
            try {
              // Trigger Step 4 asynchronously (don't wait for completion)
              fetch(step4Url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postId: post.id }),
              }).catch((error) => {
                console.error(`❌ Failed to trigger Step 4 for post ${post.id}:`, error);
                updatePostStatus(post.id, "failed", `Failed to trigger Step 4: ${error instanceof Error ? error.message : "Unknown error"}`);
              });

              return {
                id: post.id,
                success: true,
                message: "Step 4 triggered - Platform posts in progress",
                inProgress: true,
              };
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : "Unknown error";
              console.error(`❌ Error triggering Step 4 for post ${post.id}:`, error);
              await updatePostStatus(post.id, "failed", `Failed to trigger Step 4: ${errorMessage}`);
              
              return {
                id: post.id,
                success: false,
                error: `Failed to trigger Step 4: ${errorMessage}`,
              };
            }
          }

          // All steps completed
          console.log(`⏭️ Skipping Blog News post ID: ${post.id} - all steps completed`);
          return {
            id: post.id,
            success: true,
            message: "All steps completed",
            skipped: true,
          };
        } catch (error) {
          const errorDetails = {
            message: error instanceof Error ? error.message : "Unknown error",
            type: error instanceof Error ? error.constructor.name : "Unknown",
            stack: error instanceof Error ? error.stack : undefined,
            postId: post.id,
            campaignId: meta?.campaignId || "N/A",
            day: meta?.day || "N/A",
            timestamp: new Date().toISOString(),
          };
          const errorMessage = `Unexpected error: ${errorDetails.message}. Post ID: ${post.id}, Campaign: ${errorDetails.campaignId}, Day: ${errorDetails.day}`;
          console.error(`❌ Error processing Blog News post ID: ${post.id}:`, errorDetails);
          await updatePostStatus(post.id, "failed", errorMessage);
          
          return {
            id: post.id,
            success: false,
            error: errorMessage,
          };
        }
      })
    );

    // Helper function to get platform-specific OAuth provider
    const getOAuthProviderForPlatform = (
      post: (typeof pending)[number],
      platform: string
    ) => {
      return post.project?.projectToOAuthProviders.find(
        (p) => p.oauthProvider?.platform === platform
      )?.oauthProvider;
    };

    // Twitter implementation
    const twitterResults = await Promise.all(
      twitterPosts.map(async (post) => {
        console.log(`🔄 Processing Twitter post ID: ${post.id}`);
        try {
          const project = await prisma.projects.findUnique({
            where: { id: post.projectId },
            include: {
              user: true,
            },
          });

          if (!project || !project.user) {
            console.log(`❌ Project or user not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Project or user not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Project or user not found",
            };
          }

          if (
            !post.project?.projectToOAuthProviders[0].oauthProvider?.accessToken
          ) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          console.log(
            `👤 Found project: ${project.id} with user: ${project.user.id}`
          );

          // Check and refresh Twitter token if needed
          const tokenResult = await checkAndRefreshTwitterToken(
            project.user.id
          );

          if (!tokenResult.success) {
            console.log(`❌ Token refresh failed for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              tokenResult.error || "Token refresh failed"
            );
            return { id: post.id, success: false, error: tokenResult.error };
          }

          const oauthProvider = getOAuthProviderForPlatform(post, "twitter");

          if (!oauthProvider) {
            console.log(
              `❌ No OAuth provider found for Twitter post ID: ${post.id}`
            );
            await updatePostStatus(
              post.id,
              "failed",
              "No OAuth provider found"
            );
            return {
              id: post.id,
              success: false,
              error: "No OAuth provider found",
            };
          }

          // Post to Twitter
          const tweetResult = await postToTwitter(
            oauthProvider.accessToken,
            post.content
          );

          if (tweetResult.success) {
            console.log(
              `✅ Successfully posted to Twitter for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(`❌ Failed to post to Twitter for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", tweetResult.error);
            return { id: post.id, success: false, error: tweetResult.error };
          }
        } catch (error) {
          console.error(`❌ Error processing post ID: ${post.id}`, error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const facebookResults = await Promise.all(
      facebookPosts.map(async (post) => {
        console.log(`🔄 Processing Facebook post ID: ${post.id}`);
        try {
          const oauth = post.project?.projectToOAuthProviders.find(
            (p) => p.oauthProvider?.platform === "facebook"
          )?.oauthProvider;

          if (!oauth) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          const fb = new Fb({
            accessToken: oauth.accessToken,
            refreshToken: oauth.refreshToken!,
          });
          // Post to Facebook
          const facebookResult = await fb.postToFacebook(
            post.content,
            oauth.pageId || "",
            post.media || ""
          );

          if (facebookResult.success) {
            console.log(
              `✅ Successfully posted to Facebook for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(
              `❌ Failed to post to Facebook for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "failed", facebookResult.error);
            return {
              id: post.id,
              success: false,
              error: facebookResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Facebook post ID: ${post.id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const linkedinResults = await Promise.all(
      linkedinPosts.map(async (post) => {
        console.log(`🔄 Processing Linkedin post ID: ${post.id}`);
        try {
          const project = await prisma.projects.findUnique({
            where: { id: post.projectId },
            include: {
              user: true,
            },
          });

          if (!project || !project.user) {
            console.log(`❌ Project or user not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Project or user not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Project or user not found",
            };
          }

          const oauthProvider = getOAuthProviderForPlatform(post, "linkedin");

          if (!oauthProvider?.accessToken) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          console.log(`👤 Found user: ${project.user.id}`);

          // Get Linkedin tokens
          const tokens = await getLinkedinTokensForUser(
            project.user.id.toString()
          );

          if (!tokens || !tokens.accessToken) {
            console.log(`❌ Linkedin tokens not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Linkedin tokens not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Linkedin tokens not found",
            };
          }

          if (!tokens.pageId) {
            console.log(`❌ Linkedin page not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Linkedin page not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Linkedin page not found",
            };
          }

          // Post to Linkedin
          const linkedinResult = await postToLinkedin(
            oauthProvider.pageId || "",
            oauthProvider.accessToken,
            oauthProvider.expiresAt || 0,
            post.content,
            post.media
          );

          if (linkedinResult.success) {
            console.log(
              `✅ Successfully posted to Linkedin for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(
              `❌ Failed to post to Linkedin for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "failed", linkedinResult.error);
            return {
              id: post.id,
              success: false,
              error: linkedinResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Linkedin post ID: ${post.id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const threadsResults = await Promise.all(
      threadsPosts.map(async (post) => {
        console.log(`🔄 Processing Threads post ID: ${post.id}`);
        try {
          const oauthProvider = getOAuthProviderForPlatform(post, "threads");

          if (!oauthProvider?.accessToken) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          const threads = new Threads({
            accessToken: oauthProvider.accessToken,
          });

          // Post to Threads
          const threadsResult = await threads.postToThreads(
            post.content,
            oauthProvider.pageId || "",
            post.media || ""
          );

          if (threadsResult.success) {
            console.log(
              `✅ Successfully posted to Threads for post ID: ${post.id}`
            );

            if (threadsResult.data?.type === "VIDEO") {
              await updatePostStatus(
                post.id,
                "processing",
                undefined,
                threadsResult?.data
              );
              return {
                id: post.id,
                success: true,
                message: "Waiting for meta review for video",
              };
            } else {
              await updatePostStatus(post.id, "success");
              return { id: post.id, success: true };
            }
          } else {
            console.log(`❌ Failed to post to Threads for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", threadsResult.error);
            return {
              id: post.id,
              success: false,
              error: threadsResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Threads post ID: ${post.id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const redditResults = await Promise.all(
      redditPosts.map(async (post) => {
        const oauthProvider = getOAuthProviderForPlatform(post, "reddit");

        if (!oauthProvider) {
          console.log(
            `❌ No OAuth provider found for Reddit post ID: ${post.id}`
          );
          await updatePostStatus(post.id, "failed", "No OAuth provider found");
          return {
            id: post.id,
            success: false,
            error: "No OAuth provider found",
          };
        }

        const response = await postToSocial({
          oauth: oauthProvider,
          post,
        });
        return response;
      })
    );

    const processing = await prisma.scheduledPost.findMany({
      where: {
        status: "processing",
        platform: "threads", // for now only threads require post processing
        date: {
          lte: new Date(),
        },
      },
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

    const threadsPostProcessingResult = await Promise.all(
      processing.map(async (post) => {
        const oauthProvider = getOAuthProviderForPlatform(post, "threads");

        if (!oauthProvider) {
          console.log(
            `❌ No OAuth provider found for Threads post ID: ${post.id}`
          );
          await updatePostStatus(post.id, "failed", "No OAuth provider found");
          return {
            id: post.id,
            success: false,
            error: "No OAuth provider found",
          };
        }

        const threads = new Threads({
          accessToken: oauthProvider.accessToken,
        });

        // Check and publish the container
        const checkResult = await threads.checkAndPublishContainerOnce(
          (post.meta as any)?.container?.id,
          oauthProvider.pageId || ""
        );

        if (checkResult) {
          if (checkResult.success) {
            console.log(
              `✅ Successfully published to Threads for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(
              `❌ Failed to publish to Threads for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "failed", checkResult.error);
            return {
              id: post.id,
              success: false,
              error: checkResult.error,
            };
          }
        }

        return { message: "processing" };
      })
    );

    const allResults = [
      ...blogNewsResults,
      ...twitterResults,
      ...facebookResults,
      ...linkedinResults,
      ...threadsResults,
      ...redditResults,
      ...threadsPostProcessingResult,
    ];

    return sendNextResponse({
      status: 200,
      message: "Scheduled posts processed",
      data: {
        processed: allResults.length,
        successful: allResults.filter((r) => r.success).length,
        failed: allResults.filter((r) => !r.success).length,
        blogNews: {
          processed: blogNewsResults.length,
          successful: blogNewsResults.filter((r) => r.success).length,
          failed: blogNewsResults.filter((r) => !r.success).length,
        },
        twitter: {
          processed: twitterResults.length,
          successful: twitterResults.filter((r) => r.success).length,
          failed: twitterResults.filter((r) => !r.success).length,
        },
        facebook: {
          processed: facebookResults.length,
          successful: facebookResults.filter((r) => r.success).length,
          failed: facebookResults.filter((r) => !r.success).length,
        },
        linkedin: {
          processed: linkedinResults.length,
          successful: linkedinResults.filter((r) => r.success).length,
          failed: linkedinResults.filter((r) => !r.success).length,
        },
        threads: {
          processed: threadsResults.length,
          successful: threadsResults.filter((r) => r.success).length,
          failed: threadsResults.filter((r) => !r.success).length,
        },
        details: allResults,
      },
    });
  })
);

/**
 * Update a post status in the database
 */
async function updatePostStatus(
  postId: string,
  status: "success" | "failed" | "pending" | "processing",
  error?: string,
  meta?: any
) {
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status,
      error: typeof error === "string" ? error : JSON.stringify(error),
      processedAt: new Date(),
      meta,
    },
  });
}

/**
 * Post content to Twitter
 */
async function postToTwitter(
  accessToken: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🐦 Posting to Twitter API");

    const response = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Twitter API error:", errorData);
      return {
        success: false,
        error: `Twitter API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log("✅ Successfully posted to Twitter:", data);

    return { success: true };
  } catch (error) {
    console.error("❌ Error posting to Twitter:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error posting to Twitter",
    };
  }
}

/**
 * Post content to Linkedin Page
 */
async function postToLinkedin(
  pageId: string,
  accessToken: string,
  expiresAt: number,
  content: string,
  media: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("📘 Posting to Linkedin page : ", pageId);

    // Post to the Linkedin page
    const l = new Linkedin({ accessToken, expiresAt });
    const data = await l.postToPage(pageId, content, media);
    console.log("✅ Successfully posted to Linkedin:", data);

    return { success: true };
  } catch (error) {
    console.error("❌ Error posting to Linkedin:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error posting to Linkedin",
    };
  }
}
