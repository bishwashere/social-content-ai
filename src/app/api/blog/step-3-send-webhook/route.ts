import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { sendBlogToWebhook } from "@/backend-apis/campaign-planner/blog-news";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Step 3: Send Webhook
 * 
 * This endpoint:
 * 1. Reads the scheduled post by ID
 * 2. Gets blog data from Step 2 (stored in post.meta.blog)
 * 3. Sends blog to webhook URL (with 8s timeout)
 * 4. Extracts articleUrl from webhook response
 * 5. Updates CampaignChat with articleUrl and webhook status
 * 6. Stores webhook result in post.meta
 * 7. Updates status and triggers Step 4
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      logger.error("[Step 3] Missing postId in request body");
      return NextResponse.json(
        { success: false, error: "postId is required" },
        { status: 400 }
      );
    }

    logger.log(`[Step 3] Starting for postId: ${postId}`);

    // 1. Fetch the scheduled post
    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        status: true,
        meta: true,
        projectId: true,
      },
    });

    if (!post) {
      logger.error(`[Step 3] Post not found: ${postId}`);
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // 2. Check if Step 2 completed (PRECONDITION CHECK)
    const meta = post.meta as any;
    if (!meta?.step2Completed || !meta?.blog) {
      logger.error(`[Step 3] Step 2 not completed for postId: ${postId}`);
      
      // RETRY LOGIC: If Step 2 hasn't completed, try to retry it
      const step2CompletedAt = meta?.step2CompletedAt ? new Date(meta.step2CompletedAt) : null;
      const now = new Date();
      const timeSinceStep2Start = step2CompletedAt ? now.getTime() - step2CompletedAt.getTime() : Infinity;
      
      // If Step 2 was started more than 10 minutes ago and still not complete, mark as failed
      if (timeSinceStep2Start > 10 * 60 * 1000) {
        logger.error(`[Step 3] Step 2 stuck for more than 10 minutes, marking as failed`);
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: "failed",
            error: "Step 2 (generate blog) did not complete. Blog content missing.",
          },
        });
        return NextResponse.json(
          { success: false, error: "Step 2 did not complete - blog content missing" },
          { status: 400 }
        );
      }
      
      // Otherwise, try to retry Step 2
      logger.log(`[Step 3] Retrying Step 2 for postId: ${postId}`);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      fetch(`${baseUrl}/api/blog/step-2-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      }).catch((error) => {
        logger.error(`[Step 3] Failed to retry Step 2 for postId: ${postId}`, error);
      });
      
      return NextResponse.json(
        { success: false, error: "Step 2 must be completed first - retrying Step 2" },
        { status: 400 }
      );
    }
    
    // Also verify blog exists in CampaignChat (additional safety check)
    const campaignForCheck = await prisma.campaignPlanner.findFirst({
      where: { id: meta.campaignId },
      include: {
        chats: {
          where: { day: meta.day },
        },
      },
    });
    
    const chatForCheck = campaignForCheck?.chats[0];
    if (chatForCheck) {
      const contents = chatForCheck.contents as any;
      if (!contents?.blog) {
        logger.warn(`[Step 3] Blog not found in CampaignChat for postId: ${postId}, but exists in meta. Continuing...`);
      }
    }

    if (meta.step3Completed) {
      logger.log(`[Step 3] Already completed for postId: ${postId}`);
      return NextResponse.json({
        success: true,
        message: "Step 3 already completed",
        postId,
      });
    }

    const webhookUrl = meta.webhook || "";
    if (!webhookUrl) {
      logger.log(`[Step 3] No webhook URL provided for postId: ${postId}, skipping webhook`);
      // Skip webhook but continue to Step 4
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          meta: {
            ...meta,
            step3Completed: true,
            step3Skipped: true,
            step3CompletedAt: new Date().toISOString(),
          },
        },
      });

      // Trigger Step 4
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      const step4Url = `${baseUrl}/api/blog/step-4-finalize`;
      
      logger.log(`[Step 3] Triggering Step 4: ${step4Url}`);
      fetch(step4Url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      }).catch((error) => {
        logger.error(`[Step 3] Failed to trigger Step 4 for postId: ${postId}`, error);
      });

      return NextResponse.json({
        success: true,
        message: "Step 3 skipped - No webhook URL",
        postId,
      });
    }

    logger.log(`[Step 3] Webhook URL: ${webhookUrl}`);

    // 3. REAL: Send blog to webhook
    logger.log(`[Step 3] Sending blog to webhook...`);
    const blog = meta.blog;
    
    if (!blog) {
      logger.error(`[Step 3] Blog not found in meta for postId: ${postId}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: "Blog content missing",
        },
      });
      return NextResponse.json(
        { success: false, error: "Blog content missing" },
        { status: 400 }
      );
    }
    
    // Use Promise.race to timeout webhook after 8 seconds
    let webhookSent = false;
    let articleUrl: string | null = null;
    
    try {
      const webhookPromise = sendBlogToWebhook(webhookUrl, blog, meta.day);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Webhook timeout after 8 seconds")), 8000)
      );
      const webhookResult = await Promise.race([webhookPromise, timeoutPromise]) as Awaited<ReturnType<typeof sendBlogToWebhook>>;
      
      webhookSent = webhookResult.success;
      const webhookResponseData = webhookResult.responseData;
      
      // Extract articleUrl from webhook response
      // Response structure: { status, message, data: { ...idea, articleUrl } }
      articleUrl = webhookResponseData?.data?.articleUrl || webhookResponseData?.articleUrl || null;
      
      if (webhookSent && webhookResponseData) {
        logger.log(`[Step 3] Webhook response received:`, {
          status: webhookResponseData?.status,
          message: webhookResponseData?.message,
          articleUrl: articleUrl,
        });
      }
      
      logger.log(`[Step 3] ${webhookSent ? '✅ Successfully' : '❌ Failed to'} send blog to webhook`);
    } catch (error) {
      logger.error(`[Step 3] Webhook error:`, error);
      webhookSent = false;
    }

    // 4. Update CampaignChat with articleUrl and webhook status
    const campaignForUpdate = await prisma.campaignPlanner.findFirst({
      where: { id: meta.campaignId },
      include: {
        chats: {
          where: { day: meta.day },
        },
      },
    });

    if (campaignForUpdate && campaignForUpdate.chats[0]) {
      const chat = campaignForUpdate.chats[0];
      const contents = chat.contents as any;
      await prisma.campaignChat.update({
        where: { id: chat.id },
        data: {
          contents: {
            ...contents,
            blog: {
              ...contents.blog,
              ...(articleUrl && { articleUrl: articleUrl }),
              webhookSent: webhookSent,
              webhookUrl: webhookUrl,
            },
          },
        },
      });
      if (articleUrl) {
        logger.log(`[Step 3] Article URL stored in CampaignChat: ${chat.id}`);
      }
    }

    // 5. Store webhook result in post.meta
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        meta: {
          ...meta,
          webhookSent: webhookSent,
          ...(articleUrl && { articleUrl: articleUrl }),
          step3Completed: true,
          step3CompletedAt: new Date().toISOString(),
        },
      },
    });

    logger.log(`[Step 3] ✅ Completed for postId: ${postId}. Webhook ${webhookSent ? 'sent' : 'failed'}.${articleUrl ? ` Article URL: ${articleUrl}` : ''}`);

    // 6. Trigger Step 4 (asynchronously)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const step4Url = `${baseUrl}/api/blog/step-4-finalize`;
    
    logger.log(`[Step 3] Triggering Step 4: ${step4Url}`);
    fetch(step4Url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    }).catch((error) => {
      logger.error(`[Step 3] Failed to trigger Step 4 for postId: ${postId}`, error);
    });

    return NextResponse.json({
      success: true,
      message: `Step 3 completed - Webhook ${webhookSent ? 'sent' : 'failed'}`,
      postId,
      webhookSent,
      articleUrl: articleUrl,
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
    
    logger.error(`[Step 3] Error processing postId: ${errorPostId}`, {
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
            error: `Step 3 failed: ${errorMessage}`,
          },
        });
      } catch (updateError) {
        logger.error(`[Step 3] Failed to update post status`, updateError);
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

