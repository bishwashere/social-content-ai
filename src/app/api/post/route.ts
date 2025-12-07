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
    // (in case they got stuck from a previous cron run)
    const processingWebhook = await prisma.scheduledPost.findMany({
      where: {
        status: "processing",
        platform: "webhook",
        date: {
          lte: oneHourFromNow, // Use same lenient range
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

    // Filter processing posts to only include blog-news type and truly past-due
    const processingBlogNews = processingWebhook.filter((p) => {
      const meta = p.meta as any;
      const isBlogNews = meta?.type === "blog-news";
      const isPastDue = new Date(p.date) <= now;
      return isBlogNews && isPastDue;
    });

    console.log(`📊 Found ${pending.length} pending posts (query), ${pendingPastDue.length} are past due`);
    console.log(`📊 Found ${processingBlogNews.length} processing blog-news posts (stuck)`);
    
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

    // Process Blog News posts first
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

          // IDEMPOTENCY CHECK: Check if blog was already generated for this campaign/day
          const campaign = await prisma.campaignPlanner.findFirst({
            where: { id: meta.campaignId },
            include: {
              chats: {
                where: { day: meta.day },
              },
            },
          });

          const chat = campaign?.chats[0];
          const blogData = chat?.contents as any;
          const existingBlog = blogData?.blog;
          const existingArticleUrl = existingBlog?.articleUrl;

          // If blog already exists and has articleUrl, check if platform posts were created
          if (existingBlog && existingArticleUrl) {
            // Check if platform posts already exist for this campaign/day/articleUrl
            // MongoDB Prisma doesn't support path queries, so fetch and filter
            const allProjectPosts = await prisma.scheduledPost.findMany({
              where: {
                projectId: post.projectId,
              },
              select: {
                id: true,
                meta: true,
                content: true,
              },
            });

            // Filter posts that match the criteria
            const existingPlatformPosts = allProjectPosts.filter((p) => {
              const postMeta = p.meta as any;
              return (
                postMeta?.campaignId === meta.campaignId &&
                postMeta?.day === meta.day &&
                postMeta?.source === "blog-news" &&
                (postMeta?.articleUrl === existingArticleUrl ||
                  p.content?.includes(existingArticleUrl))
              );
            });

            if (existingPlatformPosts.length > 0) {
              console.log(`⏭️ Skipping Blog News post ID: ${post.id} - blog and platform posts already exist (${existingPlatformPosts.length} platform posts found)`);
              // Mark as success since everything was already created
              await updatePostStatus(post.id, "success");
              return {
                id: post.id,
                success: true,
                message: "Blog and platform posts already exist",
                skipped: true,
                articleUrl: existingArticleUrl,
              };
            }
          }

          // Update status to processing
          await updatePostStatus(post.id, "processing");

          // Generate blog on-the-fly (same function used by manual play)
          const result = await generateBlogNewsContent({
            campaignId: meta.campaignId,
            day: meta.day,
            topics: meta.topics || [],
            angles: meta.angles || [],
            webhook: meta.webhook || "",
          });

          if (!result.success || !result.blog) {
            // Build detailed error message
            const errorDetails = {
              message: result.message || "Failed to generate blog",
              insufficientCoins: result.insufficientCoins || false,
              campaignId: meta.campaignId,
              day: meta.day,
              topics: meta.topics || [],
              angles: meta.angles || [],
              timestamp: new Date().toISOString(),
            };
            const errorMessage = result.insufficientCoins 
              ? `Insufficient coins: ${errorDetails.message}`
              : `Failed to generate blog: ${errorDetails.message}. Campaign: ${meta.campaignId}, Day: ${meta.day}, Topics: ${(meta.topics || []).join(", ")}`;
            
            console.error(`❌ Blog generation failed for post ${post.id}:`, errorDetails);
            await updatePostStatus(post.id, "failed", errorMessage);
            
            return {
              id: post.id,
              success: false,
              error: errorMessage,
              insufficientCoins: result.insufficientCoins,
            };
          }

          // Get the article URL from the blog (stored in chat contents)
          // Re-fetch campaign to get updated chat contents with articleUrl
          // Note: Removed 500ms delay to optimize for timeout - database write should be fast enough
          const updatedCampaign = await prisma.campaignPlanner.findFirst({
            where: { id: meta.campaignId },
            include: {
              chats: {
                where: { day: meta.day },
              },
            },
          });

          const updatedChat = updatedCampaign?.chats[0];
          const updatedBlogData = updatedChat?.contents as any;
          const articleUrl = updatedBlogData?.blog?.articleUrl || null;

          // Get platforms from metadata
          const platforms = meta.platforms || [];
          
          // GRACEFUL FAILURE: Don't create platform posts if articleUrl is missing
          if (platforms.length > 0) {
            if (!articleUrl) {
              console.log(`⚠️ No article URL found for Blog News post ID: ${post.id}. Skipping platform post creation.`);
              await updatePostStatus(post.id, "failed", "Blog generated but article URL not received from webhook");
              return {
                id: post.id,
                success: false,
                error: "Blog generated but article URL not received from webhook. Platform posts not created.",
                articleUrl: null,
              };
            }

            // Generate social excerpt for each platform
            const excerpt = await generateSocialExcerpt(result.blog.title, result.blog.content);
            const socialContent = `${excerpt}\n\nRead more: ${articleUrl}`;

            // Create ScheduledPost records for each platform
            const platformPostResults = await Promise.all(
              platforms.map(async (platform: string) => {
                // Convert platform name (x -> twitter)
                const platformName = platform === "x" ? "twitter" : platform;
                
                // Schedule the post for the same time (or slightly after)
                const scheduledDate = new Date(post.date);
                // Add 1 minute delay after blog generation to ensure blog is published
                scheduledDate.setMinutes(scheduledDate.getMinutes() + 1);
                
                const scheduled = await schedulePost({
                  projectId: post.projectId,
                  platform: platformName,
                  content: socialContent,
                  date: scheduledDate.toISOString(),
                  meta: {
                    campaignId: meta.campaignId,
                    campaignName: campaign?.name || "",
                    day: meta.day,
                    source: "blog-news",
                    blogNewsPostId: post.id, // Link back to original Blog News post
                    articleUrl: articleUrl, // Store articleUrl in meta for idempotency checks
                  },
                });

                return {
                  platform: platformName,
                  success: scheduled,
                };
              })
            );

            console.log(`✅ Created ${platformPostResults.filter(r => r.success).length} platform posts for Blog News post ID: ${post.id}`);
          }

          // Mark original Blog News post as completed
          await updatePostStatus(post.id, "success");

          return {
            id: post.id,
            success: true,
            message: result.message,
            articleUrl,
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
