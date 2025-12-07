import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";
import { fetchArticleForTopics } from "@/backend-apis/campaign-planner/blog-news";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Step 1: Fetch Article
 * 
 * This endpoint:
 * 1. Reads the scheduled post by ID
 * 2. Extracts metadata (campaignId, day, topics, angles)
 * 3. Fetches article from Reddit/HackerNews (with duplicate detection)
 * 4. Stores article data in post.meta for Step 2
 * 5. Updates status and triggers Step 2
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      logger.error("[Step 1] Missing postId in request body");
      return NextResponse.json(
        { success: false, error: "postId is required" },
        { status: 400 }
      );
    }

    // Check if called by another step (usually Step 1 is entry point)
    const calledBy = request.headers.get("x-called-by") || "entry-point";
    logger.log(`[Step 1] 🚀 Starting for postId: ${postId} | Called by: ${calledBy}`);

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
      logger.error(`[Step 1] Post not found: ${postId}`);
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    // 2. Check if already processing or completed
    if (post.status === "processing" && (post.meta as any)?.step1Completed) {
      logger.log(`[Step 1] Already completed for postId: ${postId}`);
      return NextResponse.json({
        success: true,
        message: "Step 1 already completed",
        postId,
      });
    }

    if (post.status === "success" || post.status === "posted") {
      logger.log(`[Step 1] Post already completed: ${postId}`);
      return NextResponse.json({
        success: true,
        message: "Post already completed",
        postId,
      });
    }

    // 3. Extract metadata
    const meta = post.meta as any;
    if (!meta || meta.type !== "blog-news") {
      logger.error(`[Step 1] Invalid metadata for postId: ${postId}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: { status: "failed", error: "Invalid Blog News metadata" },
      });
      return NextResponse.json(
        { success: false, error: "Invalid Blog News metadata" },
        { status: 400 }
      );
    }

    logger.log(`[Step 1] Metadata extracted - Campaign: ${meta.campaignId}, Day: ${meta.day}`);

    // 4. Update status to processing
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: { status: "processing" },
    });

    // 5. REAL: Fetch article from Olive Drift API (with 9s timeout)
    logger.log(`[Step 1] Fetching article for campaign ${meta.campaignId}, day ${meta.day}, topics: ${(meta.topics || []).join(", ")}`);
    const fetchPromise = fetchArticleForTopics(meta.topics || [], meta.campaignId);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Step 1 timeout after 9 seconds")), 9000)
    );
    const article = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<ReturnType<typeof fetchArticleForTopics>>;
    
    if (!article) {
      const errorMessage = `Failed to fetch article for topics: ${(meta.topics || []).join(", ")}. No articles found matching the criteria.`;
      logger.error(`[Step 1] ${errorMessage}`);
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: {
          status: "failed",
          error: errorMessage,
        },
      });
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }
    
    logger.log(`[Step 1] ✅ Article fetched - Title: ${article.title.substring(0, 50)}...`);

    // 6. Store article in post.meta for Step 2
    await prisma.scheduledPost.update({
      where: { id: postId },
      data: {
        meta: {
          ...meta,
          article: article,
          step1Completed: true,
          step1CompletedAt: new Date().toISOString(),
        },
      },
    });

    logger.log(`[Step 1] ✅ Completed for postId: ${postId}. Article stored in meta.`);

    // 7. Trigger Step 2 (asynchronously - don't wait)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
    const step2Url = `${baseUrl}/api/blog/step-2-generate`;
    
    logger.log(`[Step 1] 🔄 Calling Step 2 for postId: ${postId} | URL: ${step2Url}`);
    fetch(step2Url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Called-By": "step-1-fetch-article"
      },
      body: JSON.stringify({ postId }),
    })
    .then(() => {
      logger.log(`[Step 1] ✅ Successfully called Step 2 for postId: ${postId}`);
    })
    .catch((error) => {
      logger.error(`[Step 1] ❌ Failed to trigger Step 2 for postId: ${postId}`, error);
    });

    return NextResponse.json({
      success: true,
      message: "Step 1 completed - Article fetched",
      postId,
      article: article,
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
    
    logger.error(`[Step 1] Error processing postId: ${errorPostId}`, {
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
            error: `Step 1 failed: ${errorMessage}`,
          },
        });
      } catch (updateError) {
        logger.error(`[Step 1] Failed to update post status`, updateError);
      }
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

