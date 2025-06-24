import { UserModel } from "@/db/auth/schema/user";
import { ScheduledPostsModel } from "@/db/scheduled-posts/schema";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { checkAndRefreshTwitterToken } from "@/lib/twitter-auth";
import { getFacebookTokensForUser, getThreadsTokensForUser } from "@/lib/auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { connectToDBMiddleware } from "@/middlewares/connect-to-db";

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
    const facebookPosts = pending.filter((p) => p.platform === "facebook");
    const threadsPosts = pending.filter((p) => p.platform === "threads");
    console.log(`🐦 Found ${twitterPosts.length} Twitter posts to process`);
    console.log(`📘 Found ${facebookPosts.length} Facebook posts to process`);
    console.log(`🧵 Found ${threadsPosts.length} Threads posts to process`);

    const twitterResults = await Promise.all(
      twitterPosts.map(async (post) => {
        console.log(`🔄 Processing Twitter post ID: ${post._id}`);
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

    const facebookResults = await Promise.all(
      facebookPosts.map(async (post) => {
        console.log(`🔄 Processing Facebook post ID: ${post._id}`);
        try {
          const user = await UserModel.findById(post.userId);

          if (!user) {
            console.log(`❌ User not found for post ID: ${post._id}`);
            await updatePostStatus(post._id, "failed", "User not found");
            return { id: post._id, success: false, error: "User not found" };
          }

          console.log(`👤 Found user: ${user._id}`);

          // Get Facebook tokens
          const tokens = await getFacebookTokensForUser(user._id.toString());

          if (!tokens || !tokens.accessToken) {
            console.log(
              `❌ Facebook tokens not found for post ID: ${post._id}`
            );
            await updatePostStatus(
              post._id,
              "failed",
              "Facebook tokens not found"
            );
            return {
              id: post._id,
              success: false,
              error: "Facebook tokens not found",
            };
          }

          // Post to Facebook
          const facebookResult = await postToFacebook(
            tokens.accessToken,
            post.content,
            tokens.facebookPageId
          );

          if (facebookResult.success) {
            console.log(
              `✅ Successfully posted to Facebook for post ID: ${post._id}`
            );
            await updatePostStatus(post._id, "success");
            return { id: post._id, success: true };
          } else {
            console.log(
              `❌ Failed to post to Facebook for post ID: ${post._id}`
            );
            await updatePostStatus(post._id, "failed", facebookResult.error);
            return {
              id: post._id,
              success: false,
              error: facebookResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Facebook post ID: ${post._id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post._id, "failed", errorMessage);
          return { id: post._id, success: false, error: errorMessage };
        }
      })
    );

    const threadsResults = await Promise.all(
      threadsPosts.map(async (post) => {
        console.log(`🔄 Processing Threads post ID: ${post._id}`);
        try {
          const user = await UserModel.findById(post.userId);

          if (!user) {
            console.log(`❌ User not found for post ID: ${post._id}`);
            await updatePostStatus(post._id, "failed", "User not found");
            return { id: post._id, success: false, error: "User not found" };
          }

          console.log(`👤 Found user: ${user._id}`);

          // Get Threads tokens
          const threadsTokens = await getThreadsTokensForUser(
            user._id.toString()
          );

          if (!threadsTokens || !threadsTokens.accessToken) {
            console.log(`❌ No Threads tokens found for post ID: ${post._id}`);
            await updatePostStatus(
              post._id,
              "failed",
              "No Threads access token found"
            );
            return {
              id: post._id,
              success: false,
              error: "No Threads access token found",
            };
          }

          // Post to Threads
          const threadsResult = await postToThreads(
            threadsTokens.accessToken,
            post.content
          );

          if (threadsResult.success) {
            console.log(
              `✅ Successfully posted to Threads for post ID: ${post._id}`
            );
            await updatePostStatus(post._id, "success");
            return { id: post._id, success: true };
          } else {
            console.log(
              `❌ Failed to post to Threads for post ID: ${post._id}`
            );
            await updatePostStatus(post._id, "failed", threadsResult.error);
            return {
              id: post._id,
              success: false,
              error: threadsResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Threads post ID: ${post._id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post._id, "failed", errorMessage);
          return { id: post._id, success: false, error: errorMessage };
        }
      })
    );

    const allResults = [...twitterResults, ...facebookResults, ...threadsResults];

    return sendNextResponse({
      status: 200,
      message: "Scheduled posts processed",
      data: {
        processed: allResults.length,
        successful: allResults.filter((r) => r.success).length,
        failed: allResults.filter((r) => !r.success).length,
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

/**
 * Post content to Threads
 */
async function postToThreads(
  accessToken: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🧵 Posting to Threads...");

    // First, create a media container
    const containerResponse = await fetch(
      `https://graph.threads.net/v1.0/me/threads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          media_type: "TEXT",
          text: content,
          access_token: accessToken,
        }),
      }
    );

    if (!containerResponse.ok) {
      const errorData = await containerResponse.json().catch(() => ({}));
      console.error("❌ Threads container creation error:", errorData);
      return {
        success: false,
        error: `Threads container error: ${containerResponse.status} ${containerResponse.statusText}`,
      };
    }

    const containerData = await containerResponse.json();
    const containerId = containerData.id;

    if (!containerId) {
      return {
        success: false,
        error: "Failed to create Threads media container",
      };
    }

    // Then, publish the container
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/me/threads_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: accessToken,
        }),
      }
    );

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json().catch(() => ({}));
      console.error("❌ Threads publish error:", errorData);
      return {
        success: false,
        error: `Threads publish error: ${publishResponse.status} ${publishResponse.statusText}`,
      };
    }

    const publishData = await publishResponse.json();
    console.log("✅ Successfully posted to Threads:", publishData);

    return { success: true };
  } catch (error) {
    console.error("❌ Error posting to Threads:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error posting to Threads",
    };
  }
}

/**
 * Post content to Facebook Page
 */
async function postToFacebook(
  accessToken: string,
  content: string,
  pageId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("📘 Posting to Facebook API");

    if (!pageId) {
      return {
        success: false,
        error: "Page ID is required for Facebook posting",
      };
    }

    // First, get the page access token
    const pageTokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=access_token&access_token=${accessToken}`
    );

    if (!pageTokenResponse.ok) {
      const errorData = await pageTokenResponse.json().catch(() => ({}));
      console.error("❌ Facebook Page Token error:", errorData);
      return {
        success: false,
        error: `Failed to get page token: ${pageTokenResponse.status}`,
      };
    }

    const pageTokenData = await pageTokenResponse.json();
    const pageAccessToken = pageTokenData.access_token;

    if (!pageAccessToken) {
      return {
        success: false,
        error: "Failed to retrieve page access token",
      };
    }

    // Post to the Facebook page
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          access_token: pageAccessToken,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Facebook API error:", errorData);
      return {
        success: false,
        error: `Facebook API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log("✅ Successfully posted to Facebook:", data);

    return { success: true };
  } catch (error) {
    console.error("❌ Error posting to Facebook:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error posting to Facebook",
    };
  }
}
