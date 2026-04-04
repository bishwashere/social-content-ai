import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { checkAndRefreshTwitterToken } from "@/lib/3rd-providers/twitter";
import { getLinkedinTokensForUser } from "@/lib/auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { postToSocial } from "@/lib/post-to-social";
import { Linkedin } from "@/lib/3rd-providers/linkedin";
import { checkAndRefreshLinkedinToken } from "@/lib/3rd-providers/linkedin";
import { Fb } from "@/lib/3rd-providers/fb";
import { Threads } from "@/lib/3rd-providers/threads";
import { Instagram } from "@/lib/3rd-providers/instagram";
import { generateBlogNewsContent, generateSocialExcerpt } from "@/backend-apis/campaign-planner/blog-news";
import { generateCampaignChat } from "@/backend-apis/campaign-planner/campaign-generation";
import { schedulePost } from "@/server-actions/schedule-post";
import { logger } from "@/utils/logger";
import { applyPlaceholders, getProjectPlaceholders } from "@/lib/placeholders";

export const dynamic = "force-dynamic";
// Increase timeout for blog generation (Vercel Pro allows up to 60s, Hobby is 10s)
export const maxDuration = 60; // 60 seconds for Pro plan, will be capped at 10s on Hobby plan

/**
 * For regular campaign posts scheduled without content, attempt to auto-generate
 * the content using AI at post time (uses user's coins, 1 per platform).
 * Returns the generated content string for the given platform, or null on failure.
 */
async function tryAutoGenerateCampaignContent(post: {
  id: string;
  projectId: string;
  platform: string;
  meta: unknown;
}): Promise<string | null> {
  const meta = post.meta as Record<string, any>;
  if (!meta?.campaignId || !meta?.day) return null;

  const campaignChat = await prisma.campaignChat.findFirst({
    where: {
      plannerId: meta.campaignId,
      day: Number(meta.day),
    },
    include: {
      planner: {
        include: {
          project: { include: { user: true } },
        },
      },
    },
  });

  if (!campaignChat) {
    logger.error(`[AutoGenerate] CampaignChat not found for campaign=${meta.campaignId} day=${meta.day}`);
    return null;
  }

  // CampaignChat.contents may use "twitter" or "x" as the key — check both
  const existingContents = campaignChat.contents as Record<string, string>;
  const twitterAlias = post.platform === "twitter" ? "x" : null;
  const existingContent =
    existingContents[post.platform] ?? (twitterAlias ? existingContents[twitterAlias] : null);
  if (existingContent) return existingContent;

  const user = campaignChat.planner?.project?.user;
  if (!user) {
    logger.error(`[AutoGenerate] User not found for post ${post.id}`);
    return null;
  }

  logger.log(
    `[AutoGenerate] No content found — generating for post ${post.id} ` +
      `(campaign ${meta.campaignId} day ${meta.day} platform ${post.platform})`
  );

  const result = await generateCampaignChat({
    projectId: post.projectId,
    id: meta.campaignId,
    prompt: campaignChat.title || "",
    userId: user.id,
    day: Number(meta.day),
    productRelated: false,
  });

  if (!result.success) {
    logger.error(
      `[AutoGenerate] Generation failed for post ${post.id}: ${(result as any).message}`
    );
    return null;
  }

  // Re-fetch to get the freshly generated content
  const updated = await prisma.campaignChat.findUnique({ where: { id: campaignChat.id } });
  const updatedContents = updated?.contents as Record<string, string>;
  return (
    updatedContents?.[post.platform] ??
    (twitterAlias ? updatedContents?.[twitterAlias] : null) ??
    null
  );
}

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
        
        // First, try to retry the next step (if there is one)
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
        
        // If there's a next step to retry, always retry it (don't mark as failed)
        if (retryUrl) {
          const updatedAt = new Date(post.updatedAt);
          const stuckDuration = now.getTime() - updatedAt.getTime();
          const stuckMinutes = Math.round(stuckDuration / 60000);
          
          logger.log(`[Stuck Recovery] Post ${post.id} stuck for ${stuckMinutes} minutes, retrying next step: ${retryUrl}`);
          fetch(retryUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ postId: post.id }),
          }).catch((error) => {
            logger.error(`[Stuck Recovery] Failed to retry for post ${post.id}`, error);
          });
          return { id: post.id, action: "retried", step: lastStepCompleted };
        }
        
        // Only mark as failed if there's no next step to retry AND stuck for >30 minutes
        // This handles cases where all steps are done but status is still processing (shouldn't happen)
        const updatedAt = new Date(post.updatedAt);
        const stuckDuration = now.getTime() - updatedAt.getTime();
        const thirtyMinutes = 30 * 60 * 1000;
        
        if (stuckDuration > thirtyMinutes) {
          logger.error(`[Stuck Recovery] Post ${post.id} stuck for ${Math.round(stuckDuration / 60000)} minutes with no next step to retry, marking as failed`);
          await updatePostStatus(
            post.id,
            "failed",
            `Stuck in processing for more than 30 minutes. Last completed step: ${lastStepCompleted}. No next step to retry.`
          );
          return { id: post.id, action: "marked_failed", reason: "stuck_too_long_no_retry" };
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

    // Pre-process: for campaign posts that have no content, auto-generate now using AI.
    // This handles days where the user enabled auto-post before clicking "Generate".
    const regularPostsReady = await Promise.all(
      regularPosts.map(async (post) => {
        const meta = post.meta as any;
        if (post.content || !meta?.campaignId || !meta?.day) return post;
        const generated = await tryAutoGenerateCampaignContent(post);
        if (generated) {
          await prisma.scheduledPost.update({
            where: { id: post.id },
            data: { content: generated },
          });
          return { ...post, content: generated };
        }
        return post;
      })
    );

    const twitterPosts = regularPostsReady.filter((p) => p.platform === "twitter");
    const facebookPosts = regularPostsReady.filter((p) => p.platform === "facebook");
    const linkedinPosts = regularPostsReady.filter((p) => p.platform === "linkedin");
    const threadsPosts = regularPostsReady.filter((p) => p.platform === "threads");
    const redditPosts = regularPostsReady.filter((p) => p.platform === "reddit");
    const instagramPosts = regularPostsReady.filter((p) => p.platform === "instagram");
    
    console.log(`📰 Found ${blogNewsPosts.length} Blog News posts to process`);
    console.log(`🐦 Found ${twitterPosts.length} Twitter posts to process`);
    console.log(`📘 Found ${facebookPosts.length} Facebook posts to process`);
    console.log(`📘 Found ${linkedinPosts.length} Linkedin posts to process`);
    console.log(`🧵 Found ${threadsPosts.length} Threads posts to process`);
    console.log(`📘 Found ${redditPosts.length} Reddit posts to process`);
    console.log(`📸 Found ${instagramPosts.length} Instagram posts to process`);
    
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
            // RACE CONDITION CHECK: Skip if Step 3 is already in progress
            if (meta?.step3InProgress) {
              const startedAt = meta?.step3StartedAt;
              const duration = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
              console.log(`⏭️ Skipping Blog News post ID: ${post.id} - Step 3 already in progress (started ${duration}s ago)`);
              return {
                id: post.id,
                success: true,
                message: "Step 3 already in progress",
                skipped: true,
              };
            }

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
            // RACE CONDITION CHECK: Skip if Step 4 is already in progress
            if (meta?.step4InProgress) {
              const startedAt = meta?.step4StartedAt;
              const duration = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
              console.log(`⏭️ Skipping Blog News post ID: ${post.id} - Step 4 already in progress (started ${duration}s ago)`);
              return {
                id: post.id,
                success: true,
                message: "Step 4 already in progress",
                skipped: true,
              };
            }

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

          // All steps completed - but check if platform posts were actually created
          // Only check posts from the last week to avoid checking old posts
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const isRecentPost = new Date(post.date) >= oneWeekAgo;
          
          if (meta?.step4Completed && isRecentPost) {
            // Check if ANY platform posts exist for this webhook post (regardless of status)
            const platformPosts = await prisma.scheduledPost.findMany({
              where: {
                projectId: post.projectId,
                platform: { not: "webhook" },
              },
              select: {
                id: true,
                status: true,
                meta: true,
              },
            });

            const matchingPlatformPosts = platformPosts.filter((p) => {
              const postMeta = p.meta as any;
              return postMeta?.blogNewsPostId === post.id;
            });

            // Only retry if:
            // 1. No platform posts exist at all (not even failed ones)
            // 2. We haven't retried yet
            if (matchingPlatformPosts.length === 0 && !meta?.step4Retried) {
              console.log(
                `⚠️  Step 4 completed for post ${post.id} but no platform posts found. Retrying Step 4 once...`
              );
              
              // Mark that we're retrying
              await prisma.scheduledPost.update({
                where: { id: post.id },
                data: {
                  meta: {
                    ...meta,
                    step4Retried: true,
                    step4RetryAttemptedAt: new Date().toISOString(),
                  },
                },
              });

              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                              (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
              const step4Url = `${baseUrl}/api/blog/step-4-finalize`;
              
              try {
                // Trigger Step 4 again
                fetch(step4Url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ postId: post.id }),
                }).catch((error) => {
                  console.error(`❌ Failed to retry Step 4 for post ${post.id}:`, error);
                });

                return {
                  id: post.id,
                  success: true,
                  message: "Step 4 retry triggered - no platform posts found",
                  retrying: true,
                };
              } catch (error) {
                console.error(`❌ Error retrying Step 4 for post ${post.id}:`, error);
                return {
                  id: post.id,
                  success: false,
                  error: `Failed to retry Step 4: ${error instanceof Error ? error.message : "Unknown error"}`,
                };
              }
            }

            // If platform posts exist (success or failed), don't retry
            if (matchingPlatformPosts.length > 0) {
              const statusCounts = matchingPlatformPosts.reduce((acc, p) => {
                acc[p.status] = (acc[p.status] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              
              console.log(
                `⏭️ Skipping Blog News post ID: ${post.id} - all steps completed, ${matchingPlatformPosts.length} platform posts exist (${JSON.stringify(statusCounts)})`
              );
              return {
                id: post.id,
                success: true,
                message: "All steps completed, platform posts exist",
                skipped: true,
              };
            }

            // If we already retried, don't retry again
            if (meta?.step4Retried) {
              console.log(`⏭️ Skipping Blog News post ID: ${post.id} - Step 4 already retried, no platform posts created`);
              return {
                id: post.id,
                success: false,
                message: "Step 4 completed but no platform posts created after retry",
                skipped: true,
              };
            }
          }
          
          // If post is older than 1 week, skip retry check
          if (meta?.step4Completed && !isRecentPost) {
            console.log(`⏭️ Skipping Blog News post ID: ${post.id} - older than 1 week, skipping retry check`);
            return {
              id: post.id,
              success: true,
              message: "All steps completed (old post, retry check skipped)",
              skipped: true,
            };
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
            applyPlaceholders(post.content, getProjectPlaceholders(post.project as any))
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
          const resolvedContent = applyPlaceholders(post.content, getProjectPlaceholders(post.project as any));
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
            resolvedContent,
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

          // Check and refresh LinkedIn token if expired
          const linkedinTokenResult = await checkAndRefreshLinkedinToken(
            project.user.id.toString(),
            oauthProvider.pageId || ""
          );

          if (!linkedinTokenResult.success) {
            console.log(`❌ LinkedIn token refresh failed for post ID: ${post.id}: ${linkedinTokenResult.error}`);
            await updatePostStatus(post.id, "failed", linkedinTokenResult.error || "LinkedIn token refresh failed");
            return {
              id: post.id,
              success: false,
              error: linkedinTokenResult.error,
            };
          }

          // Use the fresh access token (may have been refreshed)
          const linkedinAccessToken = linkedinTokenResult.accessToken || oauthProvider.accessToken;

          // Post to Linkedin
          const linkedinResult = await postToLinkedin(
            oauthProvider.pageId || "",
            linkedinAccessToken,
            oauthProvider.expiresAt || 0,
            applyPlaceholders(post.content, getProjectPlaceholders(post.project as any)),
            post.media
          );

          if (linkedinResult.success) {
            console.log(
              `✅ Successfully posted to Linkedin for post ID: ${post.id}`
            );
            
            // Create tracking record if we have a post URL
            if (linkedinResult.postUrl) {
              try {
                await prisma.projectTracking.create({
                  data: {
                    projectId: post.projectId,
                    platform: "linkedin",
                    url: linkedinResult.postUrl,
                    date: new Date(),
                  },
                });
                console.log(
                  `✅ Created tracking record for Linkedin post: ${linkedinResult.postUrl}`
                );
              } catch (trackingError) {
                console.error(
                  `⚠️  Failed to create tracking record for post ${post.id}:`,
                  trackingError
                );
                // Don't fail the post if tracking fails
              }
            }
            
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
            applyPlaceholders(post.content, getProjectPlaceholders(post.project as any)),
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
          post: { ...(post as any), content: applyPlaceholders(post.content, getProjectPlaceholders(post.project as any)) },
        });
        return response;
      })
    );

    const instagramResults = await Promise.all(
      instagramPosts.map(async (post) => {
        console.log(`🔄 Processing Instagram post ID: ${post.id}`);
        try {
          const oauthProvider = getOAuthProviderForPlatform(post, "instagram");

          if (!oauthProvider?.accessToken) {
            console.log(`❌ No access token found for Instagram post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          // Instagram requires media for all posts
          if (!post.media) {
            console.log(`❌ No media found for Instagram post ID: ${post.id} - Instagram requires media`);
            await updatePostStatus(post.id, "failed", "Instagram requires media (image or video) for all posts");
            return {
              id: post.id,
              success: false,
              error: "Instagram requires media (image or video) for all posts",
            };
          }

          // Use correct API endpoint based on auth flow:
          // - Standalone (Instagram Login): uses graph.instagram.com
          // - Via Facebook: uses graph.facebook.com
          const isStandaloneValue = oauthProvider.isStandalone ?? false;
          const expectedEndpoint = isStandaloneValue ? 'graph.instagram.com' : 'graph.facebook.com';
          
          console.log(`📸 Instagram OAuth Provider for post ${post.id}:`, {
            providerId: oauthProvider.id,
            pageId: oauthProvider.pageId,
            pageName: oauthProvider.pageName,
            isStandalone: oauthProvider.isStandalone,
            isStandaloneRaw: typeof oauthProvider.isStandalone,
            isStandaloneValue: isStandaloneValue,
            expectedEndpoint: expectedEndpoint,
            mediaKey: post.media,
          });
          
          // Warn if isStandalone is null/undefined (might indicate data issue)
          if (oauthProvider.isStandalone === null || oauthProvider.isStandalone === undefined) {
            console.warn(`⚠️ Instagram post ${post.id}: isStandalone is ${oauthProvider.isStandalone}, defaulting to false (graph.facebook.com). This may be incorrect if account was connected via Instagram Login.`);
          }
          
          console.log(`📸 Creating Instagram client with endpoint: ${expectedEndpoint}`);
          
          const instagram = new Instagram({
            accessToken: oauthProvider.accessToken,
            isStandalone: isStandaloneValue,
          });

          // Post to Instagram
          const instagramResult = await instagram.postToInstagram(
            applyPlaceholders(post.content, getProjectPlaceholders(post.project as any)),
            oauthProvider.pageId || "",
            post.media
          );

          if (instagramResult.success) {
            console.log(
              `✅ Successfully posted to Instagram for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(`❌ Failed to post to Instagram for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", instagramResult.error);
            return {
              id: post.id,
              success: false,
              error: instagramResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Instagram post ID: ${post.id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
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
      ...instagramResults,
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
        instagram: {
          processed: instagramResults.length,
          successful: instagramResults.filter((r) => r.success).length,
          failed: instagramResults.filter((r) => !r.success).length,
        },
        details: allResults,
      },
    });
  })
);

/**
 * Update a post status in the database
 * Handles cases where the post might not exist (e.g., deleted, race condition)
 */
async function updatePostStatus(
  postId: string,
  status: "success" | "failed" | "pending" | "processing",
  error?: string,
  meta?: any
) {
  try {
    // First check if post exists
    const existingPost = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!existingPost) {
      console.warn(`[updatePostStatus] Post ${postId} not found, skipping update`);
      return;
    }

    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status,
        error: typeof error === "string" ? error : JSON.stringify(error),
        processedAt: new Date(),
        meta,
      },
    });
  } catch (error) {
    // Handle Prisma errors gracefully
    if (error instanceof Error) {
      // Check if it's a "record not found" error
      if (error.message.includes("required but not found") || 
          error.message.includes("Record to update not found")) {
        console.warn(`[updatePostStatus] Post ${postId} not found, skipping update:`, error.message);
        return;
      }
    }
    // Log other errors but don't throw (to prevent breaking the cron)
    console.error(`[updatePostStatus] Error updating post ${postId}:`, error);
  }
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
): Promise<{ success: boolean; error?: string; postUrl?: string; postId?: string }> {
  try {
    console.log("📘 Posting to Linkedin page : ", pageId);

    // Post to the Linkedin page
    const l = new Linkedin({ accessToken, expiresAt });
    const data = await l.postToPage(pageId, content, media);
    console.log("✅ Successfully posted to Linkedin:", data);

    // Extract post ID from response (LinkedIn returns urn:li:ugcPost:...)
    const postId = data?.id || data?.value || undefined;
    let postUrl: string | undefined = undefined;
    
    if (postId) {
      // Convert LinkedIn URN to URL format
      // Format: urn:li:ugcPost:1234567890 -> https://www.linkedin.com/feed/update/urn:li:ugcPost:1234567890
      if (typeof postId === "string" && postId.startsWith("urn:li:")) {
        postUrl = `https://www.linkedin.com/feed/update/${postId}`;
      } else if (typeof postId === "string") {
        postUrl = `https://www.linkedin.com/feed/update/${postId}`;
      }
    }

    return { success: true, postUrl, postId };
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
