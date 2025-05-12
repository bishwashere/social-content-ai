import { UserModel } from "@/db/auth/schema/user";
import { OauthProvidersModel } from "@/db/oauth-providers/schema";
import { ScheduledPostsModel } from "@/db/scheduled-posts/schema";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { checkAndRefreshTwitterToken } from "@/lib/twitter-auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";
import { requestValidator } from "@/middlewares/request-validator";
import { validateUserAuth } from "@/middlewares/validate-auth";
import mongoose from "mongoose";

/**
 * Process pending scheduled posts
 */
export const GET = applyMiddleware(
  connectToDBMiddleware(),
  catchApiAsyncError(async () => {
    console.log("🔍 Finding pending scheduled posts");
    const pending = await ScheduledPostsModel.find({
      status: "pending",
      date: { $lte: new Date() }, // Only process posts that are due
    });

    console.log(`📊 Found ${pending.length} pending posts`);
    const twitterPosts = pending.filter((p) => p.platform === "twitter");
    console.log(`🐦 Found ${twitterPosts.length} Twitter posts to process`);

    const results = await Promise.all(
      twitterPosts.map(async (post) => {
        console.log(`🔄 Processing post ID: ${post._id}`);
        try {
          const user = await UserModel.findById(post.userId);

          if (!user) {
            console.log(`❌ User not found for post ID: ${post._id}`);
            await updatePostStatus(post._id, "failed", "User not found");
            return { id: post._id, success: false, error: "User not found" };
          }

          console.log(`👤 Found user: ${user._id}`);

          // Check and refresh Twitter token if needed
          const tokenResult = await checkAndRefreshTwitterToken(
            user._id.toString()
          );

          if (!tokenResult.success) {
            console.log(`❌ Token refresh failed for post ID: ${post._id}`);
            await updatePostStatus(
              post._id,
              "failed",
              tokenResult.error || "Token refresh failed"
            );
            return { id: post._id, success: false, error: tokenResult.error };
          }

          // Post to Twitter
          const tweetResult = await postToTwitter(
            tokenResult.accessToken!,
            post.content
          );

          if (tweetResult.success) {
            console.log(
              `✅ Successfully posted to Twitter for post ID: ${post._id}`
            );
            await updatePostStatus(post._id, "success");
            return { id: post._id, success: true };
          } else {
            console.log(
              `❌ Failed to post to Twitter for post ID: ${post._id}`
            );
            await updatePostStatus(post._id, "failed", tweetResult.error);
            return { id: post._id, success: false, error: tweetResult.error };
          }
        } catch (error) {
          console.error(`❌ Error processing post ID: ${post._id}`, error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post._id, "failed", errorMessage);
          return { id: post._id, success: false, error: errorMessage };
        }
      })
    );

    return sendNextResponse({
      status: 200,
      message: "Scheduled posts processed",
      data: {
        processed: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        details: results,
      },
    });
  })
);

/**
 * Update a post status in the database
 */
async function updatePostStatus(
  postId: string,
  status: "success" | "failed",
  error?: string
) {
  const update: { status: string; error?: string } = { status };
  if (error) update.error = error;

  await ScheduledPostsModel.findByIdAndUpdate(postId, { $set: update });
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
