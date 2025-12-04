import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { fetchHackerNewsPosts } from "@/backend-apis/metrics/actions";

/**
 * GET /api/hackernews
 * Fetch HackerNews posts based on keywords
 * 
 * Query params:
 * - keywords: comma-separated keywords (required)
 * - maxPosts: maximum number of posts to return (optional, default: 10)
 */
export const GET = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const keywordsParam = searchParams.get("keywords");
    const maxPostsParam = searchParams.get("maxPosts");

    if (!keywordsParam) {
      return sendNextResponse({
        status: 400,
        message: "Keywords are required",
      });
    }

    const keywords = keywordsParam.split(",").map((k) => k.trim()).filter(Boolean);
    const maxPosts = maxPostsParam ? parseInt(maxPostsParam, 10) : 10;

    if (keywords.length === 0) {
      return sendNextResponse({
        status: 400,
        message: "At least one keyword is required",
      });
    }

    if (maxPosts > 100) {
      return sendNextResponse({
        status: 400,
        message: "Maximum number of posts should be less than 100",
      });
    }

    try {
      const posts = await fetchHackerNewsPosts(keywords, maxPosts);

      return sendNextResponse({
        status: 200,
        data: posts,
        message: `Successfully fetched ${posts.length} HackerNews post(s)`,
      });
    } catch (error) {
      console.error("Error fetching HackerNews posts:", error);
      return sendNextResponse({
        status: 500,
        message: error instanceof Error ? error.message : "Failed to fetch HackerNews posts",
      });
    }
  })
);

/**
 * POST /api/hackernews
 * Fetch HackerNews posts based on keywords
 * 
 * Body:
 * {
 *   keywords: string[] (required)
 *   maxPosts?: number (optional, default: 10)
 * }
 */
export const POST = applyMiddleware(
  validateUserAuth({ errorIfNotAuthenticated: true }),
  catchApiAsyncError(async (req: NextRequest) => {
    const body = await req.json();
    const { keywords, maxPosts = 10 } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return sendNextResponse({
        status: 400,
        message: "Keywords array is required and must not be empty",
      });
    }

    if (maxPosts > 100) {
      return sendNextResponse({
        status: 400,
        message: "Maximum number of posts should be less than 100",
      });
    }

    try {
      const posts = await fetchHackerNewsPosts(keywords, maxPosts);

      return sendNextResponse({
        status: 200,
        data: posts,
        message: `Successfully fetched ${posts.length} HackerNews post(s)`,
      });
    } catch (error) {
      console.error("Error fetching HackerNews posts:", error);
      return sendNextResponse({
        status: 500,
        message: error instanceof Error ? error.message : "Failed to fetch HackerNews posts",
      });
    }
  })
);
