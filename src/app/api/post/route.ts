import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { checkAndRefreshTwitterToken } from "@/lib/twitter-auth";
import { getFacebookTokensForUser, getLinkedinTokensForUser } from "@/lib/auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";

/**
 * Process pending scheduled posts
 */
export const GET = applyMiddleware(
  catchApiAsyncError(async () => {
    console.log("🔍 Finding pending scheduled posts");
    const pending = await prisma.scheduledPost.findMany({
      where: {
        status: "pending",
        date: {
          lte: new Date(),
        },
      },
    });

    console.log(`📊 Found ${pending.length} pending posts`);
    const twitterPosts = pending.filter((p) => p.platform === "twitter");
    const facebookPosts = pending.filter((p) => p.platform === "facebook");
    const linkedinPosts = pending.filter((p) => p.platform === "linkedin");
    console.log(`🐦 Found ${twitterPosts.length} Twitter posts to process`);
    console.log(`📘 Found ${facebookPosts.length} Facebook posts to process`);
    console.log(`📘 Found ${linkedinPosts.length} Linkedin posts to process`);

    const twitterResults = await Promise.all(
      twitterPosts.map(async (post) => {
        console.log(`🔄 Processing Twitter post ID: ${post.id}`);
        try {
          const user = await prisma.user.findUnique({
            where: { id: post.userId },
          });

          if (!user) {
            console.log(`❌ User not found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "User not found");
            return { id: post.id, success: false, error: "User not found" };
          }

          console.log(`👤 Found user: ${user.id}`);

          // Check and refresh Twitter token if needed
          const tokenResult = await checkAndRefreshTwitterToken(user.id);

          if (!tokenResult.success) {
            console.log(`❌ Token refresh failed for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              tokenResult.error || "Token refresh failed"
            );
            return { id: post.id, success: false, error: tokenResult.error };
          }

          // Post to Twitter
          const tweetResult = await postToTwitter(
            tokenResult.accessToken!,
            post.content
          );

          if (tweetResult.success) {
            console.log(
              `✅ Successfully posted to Twitter for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(`❌ Failed to post to Twitter for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", tweetResult.error);
            return { id: post.id, success: false, error: tweetResult.error };
          }
        } catch (error) {
          console.error(`❌ Error processing post ID: ${post.id}`, error);
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const facebookResults = await Promise.all(
      facebookPosts.map(async (post) => {
        console.log(`🔄 Processing Facebook post ID: ${post.id}`);
        try {
          const user = await prisma.user.findUnique({
            where: { id: post.userId },
          });

          if (!user) {
            console.log(`❌ User not found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "User not found");
            return { id: post.id, success: false, error: "User not found" };
          }

          console.log(`👤 Found user: ${user.id}`);

          // Get Facebook tokens
          const tokens = await getFacebookTokensForUser(user.id.toString());

          if (!tokens || !tokens.accessToken) {
            console.log(`❌ Facebook tokens not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Facebook tokens not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Facebook tokens not found",
            };
          }

          // Post to Facebook
          const facebookResult = await postToFacebook(
            tokens.accessToken,
            post.content,
            tokens.facebookPageId || ""
          );

          if (facebookResult.success) {
            console.log(
              `✅ Successfully posted to Facebook for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(
              `❌ Failed to post to Facebook for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "failed", facebookResult.error);
            return {
              id: post.id,
              success: false,
              error: facebookResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Facebook post ID: ${post.id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const linkedinResults = await Promise.all(
      linkedinPosts.map(async (post) => {
        console.log(`🔄 Processing Linkedin post ID: ${post.id}`);
        try {
          const user = await prisma.user.findUnique({
            where: { id: post.userId },
          });

          if (!user) {
            console.log(`❌ User not found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "User not found");
            return { id: post.id, success: false, error: "User not found" };
          }

          console.log(`👤 Found user: ${user.id}`);

          // Get Linkedin tokens
          const tokens = await getLinkedinTokensForUser(user.id.toString());

          if (!tokens || !tokens.accessToken) {
            console.log(`❌ Linkedin tokens not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Linkedin tokens not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Linkedin tokens not found",
            };
          }

          // Post to Linkedin
          const linkedinResult = await postToLinkedin(
            tokens.accessToken,
            post.content
          );

          if (linkedinResult.success) {
            console.log(
              `✅ Successfully posted to Linkedin for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(
              `❌ Failed to post to Linkedin for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "failed", linkedinResult.error);
            return {
              id: post.id,
              success: false,
              error: linkedinResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Linkedin post ID: ${post.id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const allResults = [
      ...twitterResults,
      ...facebookResults,
      ...linkedinResults,
    ];

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
        linkedin: {
          processed: linkedinResults.length,
          successful: linkedinResults.filter((r) => r.success).length,
          failed: linkedinResults.filter((r) => !r.success).length,
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
  await prisma.scheduledPost.update({
    where: { id: postId },
    data: {
      status,
      error,
      processedAt: new Date(),
      
    },
  });
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
// async function postToThreads(
//   accessToken: string,
//   content: string
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     console.log("🧵 Posting to Threads...");

//     // First, create a media container
//     const containerResponse = await fetch(
//       `https://graph.threads.net/v1.0/me/threads`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           media_type: "TEXT",
//           text: content,
//           access_token: accessToken,
//         }),
//       }
//     );

//     if (!containerResponse.ok) {
//       const errorData = await containerResponse.json().catch(() => ({}));
//       console.error("❌ Threads container creation error:", errorData);
//       return {
//         success: false,
//         error: `Threads container error: ${containerResponse.status} ${containerResponse.statusText}`,
//       };
//     }

//     const containerData = await containerResponse.json();
//     const containerId = containerData.id;

//     if (!containerId) {
//       return {
//         success: false,
//         error: "Failed to create Threads media container",
//       };
//     }

//     // Then, publish the container
//     const publishResponse = await fetch(
//       `https://graph.threads.net/v1.0/me/threads_publish`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           creationid: containerId,
//           access_token: accessToken,
//         }),
//       }
//     );

//     if (!publishResponse.ok) {
//       const errorData = await publishResponse.json().catch(() => ({}));
//       console.error("❌ Threads publish error:", errorData);
//       return {
//         success: false,
//         error: `Threads publish error: ${publishResponse.status} ${publishResponse.statusText}`,
//       };
//     }

//     const publishData = await publishResponse.json();
//     console.log("✅ Successfully posted to Threads:", publishData);

//     return { success: true };
//   } catch (error) {
//     console.error("❌ Error posting to Threads:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error
//           ? error.message
//           : "Unknown error posting to Threads",
//     };
//   }
// }

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

/**
 * Post content to Linkedin Page
 */
async function postToLinkedin(
  accessToken: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("📘 Posting to Lindeding API");

    // First, get the user id
    const userDataResponse = await fetch(
      "https://api.linkedin.com/v2/userinfo",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!userDataResponse.ok) {
      const errorData = await userDataResponse.json().catch(() => ({}));
      console.error("❌ Linkedin Get User data error:", errorData);
      return {
        success: false,
        error: `Failed to get user data: ${userDataResponse.status}`,
      };
    }

    const userData = await userDataResponse.json();
    const userId = userData.sub;

    if (!userId) {
      return {
        success: false,
        error: "Failed to retrieve linkedin user id",
      };
    }

    // Post to the Linkedin page
    const response = await fetch(`https://api.linkedin.com/v2/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: `urn:li:person:${userId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Linkedin API error:", errorData);
      return {
        success: false,
        error: `Linkedin API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    console.log("✅ Successfully posted to Linkedin:", data);

    return { success: true };
  } catch (error) {
    console.error("❌ Error posting to Linkedin:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error posting to Linkedin",
    };
  }
}
