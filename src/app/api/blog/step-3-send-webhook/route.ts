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
 * 3. Sends blog to webhook URL
 * 4. Extracts articleUrl from webhook response
 * 5. Updates CampaignChat with articleUrl and webhook status
 * 6. Stores webhook result in post.meta
 * 7. Updates status and triggers Step 4
 */
export async function POST(request: NextRequest) {
  const overallStartTime = Date.now();
  let postId: string | undefined;
  try {
    const parseStartTime = Date.now();
    const body = await request.json();
    postId = body.postId;
    const parseDuration = Date.now() - parseStartTime;
    console.log(`[Step 3] ⏱️  Request parsing: ${parseDuration}ms`);

    if (!postId) {
      logger.error("[Step 3] Missing postId in request body");
      return NextResponse.json(
        { success: false, error: "postId is required" },
        { status: 400 }
      );
    }

    // Check if called by Step 2
    const calledBy = request.headers.get("x-called-by") || "unknown";
    console.log(`[Step 3] 🚀 Starting for postId: ${postId} | Called by: ${calledBy}`);
    logger.log(`[Step 3] 🚀 Starting for postId: ${postId} | Called by: ${calledBy}`);

    // 1. Fetch the scheduled post
    const fetchPostStartTime = Date.now();
    const post = await prisma.scheduledPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        status: true,
        meta: true,
        projectId: true,
      },
    });
    const fetchPostDuration = Date.now() - fetchPostStartTime;
    console.log(`[Step 3] ⏱️  Fetch post from DB: ${fetchPostDuration}ms`);

    if (!post) {
      logger.error(`[Step 3] Post not found: ${postId}`);
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // 2. IDEMPOTENCY CHECK: If already completed, return success
    const meta = post.meta as any;
    if (meta?.step3Completed) {
      logger.log(`[Step 3] Already completed for postId: ${postId}`);
      return NextResponse.json({
        success: true,
        message: "Step 3 already completed",
        postId,
      });
    }

    // 3. PRECONDITION CHECK: Verify Step 2 completed
    if (!meta?.step2Completed || !meta?.blog) {
      logger.error(`[Step 3] Step 2 not completed for postId: ${postId}`);
      
      // Check if Step 2 is in progress (Python app working on it)
      if (meta?.step2InProgress) {
        logger.log(`[Step 3] Step 2 in progress (Python app), waiting...`);
        return NextResponse.json(
          { success: false, error: "Step 2 in progress - waiting for Python app" },
          { status: 400 }
        );
      }
      
      // Check if Step 2 has terminal error
      if (meta?.step2Error && post.status === "error") {
        logger.error(`[Step 3] Step 2 has terminal error: ${meta.step2Error}`);
        return NextResponse.json(
          { success: false, error: `Step 2 failed: ${meta.step2Error}` },
          { status: 400 }
        );
      }
      
      // Step 2 not started or failed - this shouldn't happen if cron is working correctly
      logger.error(`[Step 3] Step 2 not completed and not in progress - may need manual intervention`);
      return NextResponse.json(
        { success: false, error: "Step 2 must be completed first" },
        { status: 400 }
      );
    }

    // 4. RACE CONDITION CHECK: Claim this post for Step 3 processing
    // Check if already in progress (read first to avoid race condition)
    if (meta?.step3InProgress) {
      const startedAt = meta?.step3StartedAt;
      const duration = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
      logger.warn(`[Step 3] Post ${postId} already being processed by another worker (started ${duration}s ago)`);
      return NextResponse.json({
        success: false,
        error: "Step 3 already in progress",
      });
    }

    // Atomically set step3InProgress
    // Re-read post to get latest meta (in case it changed)
    // Select only id and meta to avoid schema validation issues
    const raceCheckStartTime = Date.now();
    logger.log(`[Step 3] Checking for race condition - re-reading post ${postId}`);
    const currentPost = await prisma.scheduledPost.findFirst({
      where: { id: postId },
      select: { id: true, meta: true },
    });
    const currentMeta = (currentPost?.meta as any) || {};
    const raceCheckDuration = Date.now() - raceCheckStartTime;
    console.log(`[Step 3] ⏱️  Race condition check: ${raceCheckDuration}ms`);
    
    if (currentMeta?.step3InProgress) {
      const startedAt = currentMeta?.step3StartedAt;
      const duration = startedAt ? Math.round((Date.now() - new Date(startedAt).getTime()) / 1000) : 0;
      logger.warn(`[Step 3] Post ${postId} already being processed (double-check, started ${duration}s ago)`);
      return NextResponse.json({
        success: false,
        error: "Step 3 already in progress",
      });
    }
    
    logger.log(`[Step 3] Claiming post ${postId} for Step 3 processing`);
    const claimStartTime = Date.now();
    // Update only meta field to avoid createdAt validation issues
    await prisma.$runCommandRaw({
      update: "scheduled-posts",
      updates: [{
        q: { _id: { $oid: postId } },
        u: {
          $set: {
            "meta.step3InProgress": true,
            "meta.step3StartedAt": new Date().toISOString(),
          }
        }
      }]
    });
    const claimDuration = Date.now() - claimStartTime;
    console.log(`[Step 3] ⏱️  Claim post (set inProgress): ${claimDuration}ms`);
    logger.log(`[Step 3] Successfully claimed post ${postId}`);
    
    // 5. Verify blog exists in CampaignChat (additional safety check)
    // Select only needed fields to avoid schema validation issues
    const checkChatStartTime = Date.now();
    const campaignForCheck = await prisma.campaignPlanner.findFirst({
      where: { id: meta.campaignId },
      select: {
        id: true,
        chats: {
          where: { day: meta.day },
          select: {
            id: true,
            contents: true,
          },
        },
      },
    });
    const checkChatDuration = Date.now() - checkChatStartTime;
    console.log(`[Step 3] ⏱️  Check CampaignChat exists: ${checkChatDuration}ms`);
    
    const chatForCheck = campaignForCheck?.chats[0];
    if (chatForCheck) {
      const contents = chatForCheck.contents as any;
      if (!contents?.blog) {
        logger.warn(`[Step 3] Blog not found in CampaignChat for postId: ${postId}, but exists in meta. Continuing...`);
      }
    }

    // Trim webhook URL to ensure no whitespace issues (should already be trimmed, but be safe)
    const webhookUrl = (meta.webhook || "").trim();
    console.log(`[Step 3] Webhook URL from meta (raw): "${meta.webhook}"`);
    console.log(`[Step 3] Webhook URL from meta (trimmed): "${webhookUrl}"`);
    console.log(`[Step 3] Webhook URL length: ${webhookUrl.length}`);
    console.log(`[Step 3] Contains '/ideas': ${webhookUrl.includes('/ideas')}`);
    console.log(`[Step 3] Contains '/receive': ${webhookUrl.includes('/receive')}`);
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
      
      logger.log(`[Step 3] 🔄 Calling Step 4 for postId: ${postId} | URL: ${step4Url}`);
      fetch(step4Url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Called-By": "step-3-send-webhook"
        },
        body: JSON.stringify({ postId }),
      })
      .then(() => {
        logger.log(`[Step 3] ✅ Successfully called Step 4 for postId: ${postId}`);
      })
      .catch((error) => {
        logger.error(`[Step 3] ❌ Failed to trigger Step 4 for postId: ${postId}`, error);
      });

      return NextResponse.json({
        success: true,
        message: "Step 3 skipped - No webhook URL",
        postId,
      });
    }

    logger.log(`[Step 3] Webhook URL (final): "${webhookUrl}"`);
    logger.log(`[Step 3] Webhook URL length: ${webhookUrl.length} characters`);

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
    
    // Send blog to webhook
    let webhookSent = false;
    let articleUrl: string | null = null;
    const webhookStartTime = Date.now();
    
    try {
      console.log(`[Step 3] Starting webhook call to: "${webhookUrl}"`);
      logger.log(`[Step 3] Starting webhook call to: "${webhookUrl}"`);
      logger.log(`[Step 3] Webhook URL being passed to sendBlogToWebhook: "${webhookUrl}"`);
      const webhookResult = await sendBlogToWebhook(webhookUrl, blog, meta.day);
      
      const webhookDuration = Date.now() - webhookStartTime;
      console.log(`[Step 3] ⏱️  Webhook call: ${webhookDuration}ms (${(webhookDuration / 1000).toFixed(2)}s)`);
      logger.log(`[Step 3] Webhook call completed in ${Math.round(webhookDuration / 1000)}s`);
      
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
      const webhookDuration = Date.now() - webhookStartTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown webhook error";
      console.error(`[Step 3] ❌ Webhook error after ${webhookDuration}ms (${(webhookDuration / 1000).toFixed(2)}s):`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[Step 3] ❌ Error stack:`, error.stack);
      }
      logger.error(`[Step 3] Webhook error after ${Math.round(webhookDuration / 1000)}s:`, error);
      webhookSent = false;
      
      // Store error in meta
      logger.error(`[Step 3] Storing error in meta: ${errorMessage}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          meta: {
            ...meta,
            step3Error: errorMessage,
            step3InProgress: false,
          },
        },
      });
    }

    // 4. Update CampaignChat with articleUrl and webhook status
    logger.log(`[Step 3] Updating CampaignChat for campaign ${meta.campaignId}, day ${meta.day}`);
    const updateChatStartTime = Date.now();
    // Select only needed fields to avoid schema validation issues
    const campaignForUpdate = await prisma.campaignPlanner.findFirst({
      where: { id: meta.campaignId },
      select: {
        id: true,
        chats: {
          where: { day: meta.day },
          select: {
            id: true,
            contents: true,
          },
        },
      },
    });
    const fetchChatForUpdateDuration = Date.now() - updateChatStartTime;
    console.log(`[Step 3] ⏱️  Fetch CampaignChat for update: ${fetchChatForUpdateDuration}ms`);

    if (campaignForUpdate && campaignForUpdate.chats[0]) {
      const chat = campaignForUpdate.chats[0];
      const contents = chat.contents as any;
      logger.log(`[Step 3] Found CampaignChat ${chat.id}, updating with webhook status`);
      const updateChatWriteStartTime = Date.now();
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
      const updateChatWriteDuration = Date.now() - updateChatWriteStartTime;
      console.log(`[Step 3] ⏱️  Update CampaignChat write: ${updateChatWriteDuration}ms`);
      if (articleUrl) {
        logger.log(`[Step 3] Article URL stored in CampaignChat: ${chat.id}`);
      }
      logger.log(`[Step 3] CampaignChat updated successfully`);
    } else {
      logger.warn(`[Step 3] CampaignChat not found for campaign ${meta.campaignId}, day ${meta.day}`);
    }

    // 6. Store webhook result in post.meta
    logger.log(`[Step 3] Updating ScheduledPost ${postId} with Step 3 completion status`);
    const updatePostStartTime = Date.now();
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        meta: {
          ...meta,
          webhookSent: webhookSent,
          ...(articleUrl && { articleUrl: articleUrl }),
          step3Completed: true,
          step3CompletedAt: new Date().toISOString(),
          step3InProgress: false,
          step3Error: null, // Clear any previous errors
        },
      },
    });
    const updatePostDuration = Date.now() - updatePostStartTime;
    console.log(`[Step 3] ⏱️  Update ScheduledPost: ${updatePostDuration}ms`);

    const totalDuration = Math.round((Date.now() - new Date(meta.step3StartedAt || new Date().toISOString()).getTime()) / 1000);
    const overallDuration = Date.now() - overallStartTime;
    console.log(`[Step 3] ⏱️  ════════════════════════════════════════`);
    console.log(`[Step 3] ⏱️  TOTAL DURATION: ${overallDuration}ms (${(overallDuration / 1000).toFixed(2)}s)`);
    console.log(`[Step 3] ⏱️  ════════════════════════════════════════`);
    logger.log(`[Step 3] ✅ Completed for postId: ${postId} (took ${totalDuration}s). Webhook ${webhookSent ? 'sent' : 'failed'}.${articleUrl ? ` Article URL: ${articleUrl}` : ''}`);

    // Note: Step 4 will be triggered by the next cron run (/api/post)
    // This ensures proper state machine flow and allows for retries if needed

    return NextResponse.json({
      success: true,
      message: `Step 3 completed - Webhook ${webhookSent ? 'sent' : 'failed'}`,
      postId,
      webhookSent,
      articleUrl: articleUrl,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Get postId from the outer scope (already parsed at top)
    const errorPostId = postId || "unknown";
    
    logger.error(`[Step 3] Error processing postId: ${errorPostId}`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update post status to failed and clear inProgress flag (if we have postId)
    if (errorPostId !== "unknown") {
      try {
        // Get current meta to preserve it
        const errorPost = await prisma.scheduledPost.findFirst({
          where: { id: errorPostId },
          select: { meta: true },
        });
        const errorMeta = (errorPost?.meta as any) || {};
        
        await prisma.$runCommandRaw({
          update: "scheduled-posts",
          updates: [{
            q: { _id: { $oid: errorPostId } },
            u: {
              $set: {
                status: "failed",
                error: `Step 3 failed: ${errorMessage}`,
                "meta.step3Error": errorMessage,
                "meta.step3InProgress": false, // Clear inProgress flag to prevent stuck state
              }
            }
          }]
        });
        logger.log(`[Step 3] Cleared step3InProgress flag and marked as failed for postId: ${errorPostId}`);
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

