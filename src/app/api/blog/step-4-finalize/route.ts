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

    logger.log(`[Step 4] Starting for postId: ${postId}`);

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

    // 2. Check if Step 3 completed (PRECONDITION CHECK)
    const meta = post.meta as any;
    if (!meta?.step3Completed || !meta?.blog) {
      logger.error(`[Step 4] Step 3 not completed for postId: ${postId}`);
      
      // RETRY LOGIC: If Step 3 hasn't completed, try to retry it
      const step3CompletedAt = meta?.step3CompletedAt ? new Date(meta.step3CompletedAt) : null;
      const now = new Date();
      const timeSinceStep3Start = step3CompletedAt ? now.getTime() - step3CompletedAt.getTime() : Infinity;
      
      // If Step 3 was started more than 5 minutes ago and still not complete, mark as failed
      if (timeSinceStep3Start > 5 * 60 * 1000) {
        logger.error(`[Step 4] Step 3 stuck for more than 5 minutes, marking as failed`);
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: "failed",
            error: "Step 3 (send webhook) did not complete. Article URL missing.",
          },
        });
        return NextResponse.json(
          { success: false, error: "Step 3 did not complete - article URL missing" },
          { status: 400 }
        );
      }
      
      // Otherwise, try to retry Step 3
      logger.log(`[Step 4] Retrying Step 3 for postId: ${postId}`);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      fetch(`${baseUrl}/api/blog/step-3-send-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      }).catch((error) => {
        logger.error(`[Step 4] Failed to retry Step 3 for postId: ${postId}`, error);
      });
      
      return NextResponse.json(
        { success: false, error: "Step 3 must be completed first - retrying Step 3" },
        { status: 400 }
      );
    }

    // IDEMPOTENCY CHECK: If Step 4 already completed, return success
    if (meta.step4Completed) {
      logger.log(`[Step 4] Already completed for postId: ${postId}`);
      return NextResponse.json({
        success: true,
        message: "Step 4 already completed",
        postId,
      });
    }

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
      select: { name: true, projectId: true },
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
        await prisma.scheduledPost.update({
          where: { id: errorPostId },
          data: {
            status: "failed",
            error: `Step 4 failed: ${errorMessage}`,
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

