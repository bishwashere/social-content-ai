import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { schedulePost } from "@/server-actions/schedule-post";
import { generateSocialExcerpt } from "@/backend-apis/campaign-planner/blog-news";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Step 4: Finalize - Create Platform Posts
 * 
 * This endpoint:
 * 1. Reads the scheduled post by ID
 * 2. Gets articleUrl from Step 3 (stored in post.meta.articleUrl)
 * 3. Gets blog data from Step 2 (stored in post.meta.blog)
 * 4. Creates ScheduledPost records for each platform
 * 5. Marks original Blog News post as "success"
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      logger.error("[Step 4] Missing postId in request body");
      return NextResponse.json(
        { success: false, error: "postId is required" },
        { status: 400 }
      );
    }

    // Check if called by Step 3
    const calledBy = request.headers.get("x-called-by") || "unknown";
    logger.log(`[Step 4] 🚀 Starting for postId: ${postId} | Called by: ${calledBy}`);

    // 1. Fetch the scheduled post
    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        status: true,
        meta: true,
        projectId: true,
        date: true,
      },
    });

    if (!post) {
      logger.error(`[Step 4] Post not found: ${postId}`);
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // 2. IDEMPOTENCY CHECK: If already completed, check if retry is needed
    const meta = post.meta as any;
    if (meta?.step4Completed) {
      // Check if this is a retry request (cron detected missing platform posts)
      if (meta?.step4Retried) {
        logger.log(`[Step 4] Retry requested for postId: ${postId} - checking if platform posts exist`);
        
        // Check if platform posts actually exist
        const existingPlatformPosts = await prisma.scheduledPost.findMany({
          where: {
            projectId: post.projectId,
            platform: { not: "webhook" },
          },
          select: {
            id: true,
            meta: true,
          },
        });
        
        const matchingPlatformPosts = existingPlatformPosts.filter((p) => {
          const postMeta = p.meta as any;
          return postMeta?.blogNewsPostId === postId;
        });
        
        // If platform posts exist, don't retry
        if (matchingPlatformPosts.length > 0) {
          logger.log(`[Step 4] Platform posts exist (${matchingPlatformPosts.length}), skipping retry`);
          return NextResponse.json({
            success: true,
            message: "Step 4 already completed, platform posts exist",
            postId,
          });
        }
        
        // Platform posts don't exist, allow retry by resetting step4Completed
        logger.log(`[Step 4] No platform posts found, allowing retry for postId: ${postId}`);
        
        // Reset step4Completed so Step 4 can run again
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            meta: {
              ...meta,
              step4Completed: false,
              step4InProgress: false, // Clear inProgress flag too
            },
          },
        });
        
        // Re-fetch post to get updated meta
        const updatedPost = await prisma.scheduledPost.findUnique({
          where: { id: postId },
          select: {
            id: true,
            status: true,
            meta: true,
            projectId: true,
            date: true,
          },
        });
        
        if (updatedPost) {
          // Update local meta reference
          Object.assign(meta, updatedPost.meta as any);
        }
        
        // Continue to process (don't return early)
      } else {
        // Normal case: already completed and not a retry
        logger.log(`[Step 4] Already completed for postId: ${postId}`);
        return NextResponse.json({
          success: true,
          message: "Step 4 already completed",
          postId,
        });
      }
    }

    // 3. PRECONDITION CHECK: Verify Step 3 completed
    if (!meta?.step3Completed || !meta?.blog) {
      logger.error(`[Step 4] Step 3 not completed for postId: ${postId}`);
      
      // Check if Step 3 is in progress
      if (meta?.step3InProgress) {
        logger.log(`[Step 4] Step 3 in progress, waiting...`);
        return NextResponse.json(
          { success: false, error: "Step 3 in progress - waiting" },
          { status: 400 }
        );
      }
      
      // Check if Step 3 has terminal error
      if (meta?.step3Error && post.status === "error") {
        logger.error(`[Step 4] Step 3 has terminal error: ${meta.step3Error}`);
        return NextResponse.json(
          { success: false, error: `Step 3 failed: ${meta.step3Error}` },
          { status: 400 }
        );
      }
      
      // Step 3 not started or failed
      logger.error(`[Step 4] Step 3 not completed and not in progress - may need manual intervention`);
      return NextResponse.json(
        { success: false, error: "Step 3 must be completed first" },
        { status: 400 }
      );
    }

    // 4. RACE CONDITION CHECK: Claim this post for Step 4 processing
    // Check if already in progress (read first to avoid race condition)
    if (meta?.step4InProgress) {
      logger.warn(`[Step 4] Post ${postId} already being processed by another worker`);
      return NextResponse.json({
        success: false,
        error: "Step 4 already in progress",
      });
    }

    // Atomically set step4InProgress
    // Re-read post to get latest meta (in case it changed)
    // Select only id and meta to avoid schema validation issues
    const currentPost = await prisma.scheduledPost.findFirst({
      where: { id: postId },
      select: { id: true, meta: true },
    });
    const currentMeta = (currentPost?.meta as any) || {};
    
    if (currentMeta?.step4InProgress) {
      logger.warn(`[Step 4] Post ${postId} already being processed (double-check)`);
      return NextResponse.json({
        success: false,
        error: "Step 4 already in progress",
      });
    }
    
    // Update only meta field to avoid createdAt validation issues
    await prisma.$runCommandRaw({
      update: "scheduled-posts",
      updates: [{
        q: { _id: { $oid: postId } },
        u: {
          $set: {
            "meta.step4InProgress": true,
            "meta.step4StartedAt": new Date().toISOString(),
          }
        }
      }]
    });

    const articleUrl = meta.articleUrl;
    if (!articleUrl) {
      logger.log(`[Step 4] No article URL for postId: ${postId}, skipping platform posts`);
      // Mark as success even without platform posts
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "success",
          meta: {
            ...meta,
            step4Completed: true,
            step4Skipped: true,
            step4CompletedAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json({
        success: true,
        message: "Step 4 skipped - No article URL",
        postId,
      });
    }
    
    // IDEMPOTENCY CHECK: Verify campaign/platform config still valid
    const campaign = await prisma.campaignPlanner.findFirst({
      where: { id: meta.campaignId },
      select: { 
        name: true, 
        projectId: true,
        blogNewsMetadata: true, // Get timezone from campaign metadata
      },
    });
    
    if (!campaign) {
      logger.error(`[Step 4] Campaign not found: ${meta.campaignId}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: `Campaign not found: ${meta.campaignId}`,
        },
      });
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }
    
    // IDEMPOTENCY CHECK: Check if platform posts already exist for this postId
    const existingPlatformPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: post.projectId,
      },
      select: {
        id: true,
        meta: true,
      },
    });
    
    const matchingPlatformPosts = existingPlatformPosts.filter((p) => {
      const postMeta = p.meta as any;
      return (
        postMeta?.blogNewsPostId === postId ||
        (postMeta?.campaignId === meta.campaignId &&
         postMeta?.day === meta.day &&
         postMeta?.source === "blog-news" &&
         postMeta?.articleUrl === articleUrl)
      );
    });
    
    if (matchingPlatformPosts.length > 0) {
      logger.log(`[Step 4] Platform posts already exist for postId: ${postId} (${matchingPlatformPosts.length} posts found). Skipping creation.`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "success",
          meta: {
            ...meta,
            step4Completed: true,
            step4Skipped: true,
            step4CompletedAt: new Date().toISOString(),
            platformPosts: matchingPlatformPosts.map(p => ({
              platform: (p.meta as any)?.platform || "unknown",
              success: true,
              existing: true,
            })),
          },
        },
      });
      return NextResponse.json({
        success: true,
        message: "Step 4 skipped - Platform posts already exist",
        postId,
        existingPosts: matchingPlatformPosts.length,
      });
    }

    logger.log(`[Step 4] Article URL: ${articleUrl}`);

    // 3. Get platforms from metadata
    const platforms = meta.platforms || [];
    if (platforms.length === 0) {
      logger.log(`[Step 4] No platforms specified for postId: ${postId}`);
      // Mark as success even without platform posts
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "success",
          meta: {
            ...meta,
            step4Completed: true,
            step4Skipped: true,
            step4CompletedAt: new Date().toISOString(),
          },
        },
      });
      return NextResponse.json({
        success: true,
        message: "Step 4 skipped - No platforms specified",
        postId,
      });
    }

    logger.log(`[Step 4] Creating platform posts for: ${platforms.join(", ")}`);

    // 4. Generate social excerpt
    const blog = meta.blog;
    const excerpt = await generateSocialExcerpt(blog.title, blog.content);
    const socialContent = `${excerpt}\n\nRead more: ${articleUrl}`;

    // 6. Create ScheduledPost records for each platform
    const platformPostResults = await Promise.all(
      platforms.map(async (platform: string) => {
        try {
          // Convert platform name (x -> twitter)
          const platformName = platform === "x" ? "twitter" : platform;

          // Schedule the post for the same time (or slightly after)
          const scheduledDate = new Date(post.date);
          scheduledDate.setMinutes(scheduledDate.getMinutes() + 1);

          // Guardrail: If the scheduled date is in the past, schedule for now + 1 minute instead
          const now = new Date();
          if (scheduledDate.getTime() < now.getTime()) {
            logger.warn(
              `[Step 4] Original scheduled date is in the past for platform ${platformName} (${scheduledDate.toISOString()}), scheduling for now + 1 minute instead`
            );
            // Schedule for 1 minute from now to give a small buffer
            scheduledDate.setTime(now.getTime() + 60 * 1000);
            logger.log(
              `[Step 4] Rescheduled to: ${scheduledDate.toISOString()}`
            );
          }

          // Get timezone from campaign metadata or use EST as default
          const campaignMetadata = campaign?.blogNewsMetadata as { timezone?: string } | null;
          const timezoneToUse = campaignMetadata?.timezone || meta.timezone || "America/New_York";

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
              blogNewsPostId: postId,
              articleUrl: articleUrl,
              timezone: timezoneToUse, // Store timezone for display
            },
          });

          return {
            platform: platformName,
            success: scheduled,
          };
        } catch (error) {
          logger.error(`[Step 4] Failed to create platform post for ${platform}`, error);
          return {
            platform,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      })
    );

    const successfulPlatforms = platformPostResults.filter((r) => r.success);
    logger.log(
      `[Step 4] Created ${successfulPlatforms.length}/${platforms.length} platform posts for postId: ${postId}`
    );

    // 7. Mark original Blog News post as success
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        status: "success",
        meta: {
          ...meta,
          step4Completed: true,
          step4CompletedAt: new Date().toISOString(),
          step4InProgress: false,
          step4Error: null, // Clear any previous errors
          platformPosts: platformPostResults,
        },
      },
    });

    logger.log(`[Step 4] ✅ Completed for postId: ${postId}. All steps finished.`);

    return NextResponse.json({
      success: true,
      message: "Step 4 completed - Platform posts created",
      postId,
      platformPosts: platformPostResults,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Try to get postId from request body (already parsed at top)
    let errorPostId = "unknown";
    try {
      const body = await request.json();
      errorPostId = body.postId || "unknown";
    } catch {
      // Request body already consumed, use unknown
    }
    
    logger.error(`[Step 4] Error processing postId: ${errorPostId}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update post status to failed (if we have postId)
    if (errorPostId !== "unknown") {
      try {
        const failedPost = await prisma.scheduledPost.findUnique({
          where: { id: errorPostId },
        });
        const failedMeta = (failedPost?.meta as any) || {};
        
        await prisma.scheduledPost.update({
          where: { id: errorPostId },
          data: {
            status: "failed",
            error: `Step 4 failed: ${errorMessage}`,
            meta: {
              ...failedMeta,
              step4Error: errorMessage,
              step4InProgress: false,
            },
          },
        });
      } catch (updateError) {
        logger.error(`[Step 4] Failed to update post status`, updateError);
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

