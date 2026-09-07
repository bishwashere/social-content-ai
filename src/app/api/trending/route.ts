import { NextRequest } from "next/server";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { validateUserAuth } from "@/middlewares/validate-auth";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { fetchRedditPosts, fetchHackerNewsPosts } from "@/backend-apis/metrics/actions";

/**
 * GET /api/trending
 * Fetch trending posts from Reddit and HackerNews by category/keywords
 * Query params: keywords (comma-separated), maxPosts (optional, default 2)
 * Note: The frontend currently requests maxPosts=4 to show 4 posts from each source
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
    const maxPosts = maxPostsParam ? parseInt(maxPostsParam, 10) : 2;

    if (keywords.length === 0) {
      return sendNextResponse({
        status: 400,
        message: "At least one keyword is required",
      });
    }

    const getErrorMessage = (result: PromiseSettledResult<unknown>, source: string) => {
      if (result.status === "fulfilled") return null;
      return `${source}: ${result.reason instanceof Error ? result.reason.message : "Failed to fetch posts"}`;
    };

    // Fetch posts from Reddit and HackerNews independently so one upstream issue
    // does not break the whole dashboard widget.
    const [redditResult, hackerNewsResult] = await Promise.allSettled([
      fetchRedditPosts(keywords, maxPosts),
      fetchHackerNewsPosts(keywords, maxPosts),
    ]);

    const redditPosts = redditResult.status === "fulfilled" ? redditResult.value : [];
    const hackerNewsPosts = hackerNewsResult.status === "fulfilled" ? hackerNewsResult.value : [];
    const warnings = [
      getErrorMessage(redditResult, "Reddit"),
      getErrorMessage(hackerNewsResult, "HackerNews"),
    ].filter(Boolean);

    if (warnings.length) {
      console.warn("Trending posts fetched with warnings:", warnings);
    }

    return sendNextResponse({
      status: 200,
      data: {
        reddit: redditPosts.slice(0, maxPosts),
        hackernews: hackerNewsPosts.slice(0, maxPosts),
        warnings,
      },
      message: warnings.length
        ? `Fetched trending posts with ${warnings.length} warning(s)`
        : `Successfully fetched ${redditPosts.length} Reddit and ${hackerNewsPosts.length} HackerNews posts`,
    });
  })
);
