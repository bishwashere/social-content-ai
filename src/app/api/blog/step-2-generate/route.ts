import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { generateBlogFromArticle } from "@/backend-apis/campaign-planner/blog-news";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Step 2: Generate Blog
 * 
 * This endpoint:
 * 1. Reads the scheduled post by ID
 * 2. Gets article data from Step 1 (stored in post.meta.article)
 * 3. Checks user coins and deducts 3 coins
 * 4. Generates blog using Gemini AI with angles
 * 5. Stores blog in CampaignChat.contents.blog
 * 6. Stores blog data in post.meta for Step 3
 * 7. Updates status and triggers Step 3
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      logger.error("[Step 2] Missing postId in request body");
      return NextResponse.json(
        { success: false, error: "postId is required" },
        { status: 400 }
      );
    }

    // Check if called by Step 1
    const calledBy = request.headers.get("x-called-by") || "unknown";
    logger.log(`[Step 2] 🚀 Starting for postId: ${postId} | Called by: ${calledBy}`);

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
      logger.error(`[Step 2] Post not found: ${postId}`);
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // 2. Check if Step 1 completed (PRECONDITION CHECK)
    const meta = post.meta as any;
    if (!meta?.step1Completed || !meta?.article) {
      logger.error(`[Step 2] Step 1 not completed for postId: ${postId}`);
      
      // RETRY LOGIC: If Step 1 hasn't completed, try to retry it
      const step1CompletedAt = meta?.step1CompletedAt ? new Date(meta.step1CompletedAt) : null;
      const now = new Date();
      const timeSinceStep1Start = step1CompletedAt ? now.getTime() - step1CompletedAt.getTime() : Infinity;
      
      // If Step 1 was started more than 5 minutes ago and still not complete, mark as failed
      if (timeSinceStep1Start > 5 * 60 * 1000) {
        logger.error(`[Step 2] Step 1 stuck for more than 5 minutes, marking as failed`);
        await prisma.scheduledPost.update({
          where: { id: postId },
          data: {
            status: "failed",
            error: "Step 1 (fetch article) did not complete. Article data missing.",
          },
        });
        return NextResponse.json(
          { success: false, error: "Step 1 did not complete - article data missing" },
          { status: 400 }
        );
      }
      
      // Otherwise, try to retry Step 1
      logger.log(`[Step 2] Retrying Step 1 for postId: ${postId}`);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
      fetch(`${baseUrl}/api/blog/step-1-fetch-article`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      }).catch((error) => {
        logger.error(`[Step 2] Failed to retry Step 1 for postId: ${postId}`, error);
      });
      
      return NextResponse.json(
        { success: false, error: "Step 1 must be completed first - retrying Step 1" },
        { status: 400 }
      );
    }

    if (meta.step2Completed) {
      logger.log(`[Step 2] Already completed for postId: ${postId}`);
      return NextResponse.json({
        success: true,
        message: "Step 2 already completed",
        postId,
      });
    }

    logger.log(`[Step 2] Article found - Title: ${meta.article.title.substring(0, 50)}...`);

    // 3. Get campaign and user to check coins before generating blog
    const campaign = await prisma.campaignPlanner.findFirst({
      where: { id: meta.campaignId },
      include: {
        project: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!campaign || !campaign.project) {
      logger.error(`[Step 2] Campaign or project not found for postId: ${postId}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: "Campaign or project not found",
        },
      });
      return NextResponse.json(
        { success: false, error: "Campaign or project not found" },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: campaign.project.userId },
    });

    if (!user) {
      logger.error(`[Step 2] User not found for postId: ${postId}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: "User not found",
        },
      });
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has enough coins (3 coins per blog generation)
    const requiredCoins = 3;
    if (user.remainingChatGenerations < requiredCoins) {
      const errorMessage = `You need ${requiredCoins} coins to generate a blog post.`;
      logger.error(`[Step 2] ${errorMessage}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: errorMessage,
          meta: {
            ...meta,
            insufficientCoins: true,
          },
        },
      });
      return NextResponse.json(
        { success: false, error: errorMessage, insufficientCoins: true },
        { status: 400 }
      );
    }

    // 4. REAL: Generate blog from article with angles
    logger.log(`[Step 2] Generating blog from article with ${(meta.angles || []).length} angles`);
    let blog;
    try {
      blog = await generateBlogFromArticle(
        meta.article.title,
        meta.article.content,
        meta.angles || []
      );
      
      if (!blog) {
        throw new Error("Blog generation returned null");
      }
      
      logger.log(`[Step 2] ✅ Blog generated - Title: ${blog.title.substring(0, 50)}...`);
    } catch (blogError) {
      const errorMessage = blogError instanceof Error 
        ? blogError.message 
        : `Failed to generate blog from article "${meta.article.title.substring(0, 50)}...". Unknown error occurred.`;
      logger.error(`[Step 2] Blog generation error:`, {
        error: errorMessage,
        articleTitle: meta.article.title.substring(0, 100),
        articleContentLength: meta.article.content.length,
        anglesCount: (meta.angles || []).length,
      });
      
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: errorMessage,
        },
      });
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }

    // Add source article info (including articleId for duplicate detection)
    blog.sourceArticle = {
      ...meta.article,
      articleId: meta.article.articleId,
    };

    // 5. Deduct coins (3 coins per blog generation)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        remainingChatGenerations: {
          decrement: requiredCoins,
        },
      },
    });
    logger.log(`[Step 2] Deducted ${requiredCoins} coins from user ${user.id}`);

    // 6. Get chat for storing blog
    const campaignForChat = await prisma.campaignPlanner.findFirst({
      where: { id: meta.campaignId },
      include: {
        chats: {
          where: { day: meta.day },
        },
      },
    });

    if (!campaignForChat) {
      logger.error(`[Step 2] Campaign not found: ${meta.campaignId}`);
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

    const chat = campaignForChat.chats[0];
    if (!chat) {
      logger.error(`[Step 2] Chat not found for day ${meta.day}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: `Chat not found for day ${meta.day}`,
        },
      });
      return NextResponse.json(
        { success: false, error: "Chat not found" },
        { status: 404 }
      );
    }

    // 6. Store blog in CampaignChat contents
    await prisma.campaignChat.update({
      where: { id: chat.id },
      data: {
        contents: {
          blog: blog,
        },
        status: "GENERATED",
      },
    });

    logger.log(`[Step 2] Blog stored in CampaignChat: ${chat.id}`);

    // 8. Store blog data in post.meta for Step 3
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        meta: {
          ...meta,
          blog: blog,
          step2Completed: true,
          step2CompletedAt: new Date().toISOString(),
        },
      },
    });

    logger.log(`[Step 2] ✅ Completed for postId: ${postId}. Blog stored.`);

    // 9. Trigger Step 3 (asynchronously)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const step3Url = `${baseUrl}/api/blog/step-3-send-webhook`;
    
    logger.log(`[Step 2] 🔄 Calling Step 3 for postId: ${postId} | URL: ${step3Url}`);
    fetch(step3Url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Called-By": "step-2-generate"
      },
      body: JSON.stringify({ postId }),
    })
    .then(() => {
      logger.log(`[Step 2] ✅ Successfully called Step 3 for postId: ${postId}`);
    })
    .catch((error) => {
      logger.error(`[Step 2] ❌ Failed to trigger Step 3 for postId: ${postId}`, error);
    });

    return NextResponse.json({
      success: true,
      message: "Step 2 completed - Blog generated",
      postId,
      blog: blog,
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
    
    logger.error(`[Step 2] Error processing postId: ${errorPostId}`, {
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
            error: `Step 2 failed: ${errorMessage}`,
          },
        });
      } catch (updateError) {
        logger.error(`[Step 2] Failed to update post status`, updateError);
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

