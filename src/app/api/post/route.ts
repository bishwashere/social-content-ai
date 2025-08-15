import { prisma } from "@/lib/prisma";
import catchApiAsyncError from "@/lib/catch-api-async-error";
import { sendNextResponse } from "@/lib/send-next-response";
import { checkAndRefreshTwitterToken } from "@/lib/twitter-auth";
import { getLinkedinTokensForUser } from "@/lib/auth";
import { applyMiddleware } from "@/middlewares/apply-middleware";
import { postToSocial } from "@/lib/post-to-social";
import { Linkedin } from "@/lib/3rd-providers/linkedin";
import { Fb } from "@/lib/3rd-providers/fb";

export const dynamic = "force-dynamic";
/**
 * Process pending scheduled posts
 */
export const GET = applyMiddleware(
  catchApiAsyncError(async () => {
    console.log("🔍 Finding pending scheduled posts");
    const pending = await prisma.scheduledPost.findMany({
      where: {
        status: "pending",
        // date: {
        //   lte: new Date(),
        // },
      },
      include: {
        project: {
          include: {
            projectToOAuthProviders: {
              include: {
                oauthProvider: true,
              },
            },
          },
        },
      },
    });

    console.log(`📊 Found ${pending.length} pending posts`);
    const twitterPosts = pending.filter((p) => p.platform === "twitter");
    const facebookPosts = pending.filter((p) => p.platform === "facebook");
    const linkedinPosts = pending.filter((p) => p.platform === "linkedin");
    const threadsPosts = pending.filter((p) => p.platform === "threads");
    const redditPosts = pending.filter((p) => p.platform === "reddit");
    console.log(`🐦 Found ${twitterPosts.length} Twitter posts to process`);
    console.log(`📘 Found ${facebookPosts.length} Facebook posts to process`);
    console.log(`📘 Found ${linkedinPosts.length} Linkedin posts to process`);
    console.log(`🧵 Found ${threadsPosts.length} Threads posts to process`);
    console.log(`📘 Found ${redditPosts.length} Reddit posts to process`);

    // Helper function to get platform-specific OAuth provider
    const getOAuthProviderForPlatform = (post: any, platform: string) => {
      return post.project?.projectToOAuthProviders.find(
        (p: any) => p.oauthProvider?.platform === platform
      )?.oauthProvider;
    };

    // Twitter implementation
    const twitterResults = await Promise.all(
      twitterPosts.map(async (post) => {
        console.log(`🔄 Processing Twitter post ID: ${post.id}`);
        try {
          const project = await prisma.projects.findUnique({
            where: { id: post.projectId },
            include: {
              user: true,
            },
          });

          if (!project || !project.user) {
            console.log(`❌ Project or user not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Project or user not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Project or user not found",
            };
          }

          if (
            !post.project?.projectToOAuthProviders[0].oauthProvider?.accessToken
          ) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          console.log(
            `👤 Found project: ${project.id} with user: ${project.user.id}`
          );

          // Check and refresh Twitter token if needed
          const tokenResult = await checkAndRefreshTwitterToken(
            project.user.id
          );

          if (!tokenResult.success) {
            console.log(`❌ Token refresh failed for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              tokenResult.error || "Token refresh failed"
            );
            return { id: post.id, success: false, error: tokenResult.error };
          }

          const oauthProvider = getOAuthProviderForPlatform(post, "twitter");

          if (!oauthProvider) {
            console.log(
              `❌ No OAuth provider found for Twitter post ID: ${post.id}`
            );
            await updatePostStatus(
              post.id,
              "failed",
              "No OAuth provider found"
            );
            return {
              id: post.id,
              success: false,
              error: "No OAuth provider found",
            };
          }

          // Post to Twitter
          const tweetResult = await postToTwitter(
            oauthProvider.accessToken,
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
          const oauth = post.project?.projectToOAuthProviders.find(
            (p) => p.oauthProvider?.platform === "facebook"
          )?.oauthProvider;

          if (!oauth) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          const fb = new Fb({
            accessToken: oauth.accessToken,
            refreshToken: oauth.refreshToken!,
          });
          // Post to Facebook
          const facebookResult = await fb.postToFacebook(
            post.content,
            oauth.pageId || "",
            post.media || ""
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
          const project = await prisma.projects.findUnique({
            where: { id: post.projectId },
            include: {
              user: true,
            },
          });

          if (!project || !project.user) {
            console.log(`❌ Project or user not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Project or user not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Project or user not found",
            };
          }

          const oauthProvider = getOAuthProviderForPlatform(post, "linkedin");

          if (!oauthProvider?.accessToken) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          console.log(`👤 Found user: ${project.user.id}`);

          // Get Linkedin tokens
          const tokens = await getLinkedinTokensForUser(
            project.user.id.toString()
          );

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

          if (!tokens.pageId) {
            console.log(`❌ Linkedin page not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Linkedin page not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Linkedin page not found",
            };
          }

          // Post to Linkedin
          const linkedinResult = await postToLinkedin(
            oauthProvider.pageId,
            oauthProvider.accessToken,
            oauthProvider.expiresAt,
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

    const threadsResults = await Promise.all(
      threadsPosts.map(async (post) => {
        console.log(`🔄 Processing Threads post ID: ${post.id}`);
        try {
          const project = await prisma.projects.findUnique({
            where: { id: post.projectId },
            include: {
              user: true,
            },
          });

          if (!project || !project.user) {
            console.log(`❌ Project or user not found for post ID: ${post.id}`);
            await updatePostStatus(
              post.id,
              "failed",
              "Project or user not found"
            );
            return {
              id: post.id,
              success: false,
              error: "Project or user not found",
            };
          }

          const oauthProvider = getOAuthProviderForPlatform(post, "threads");

          if (!oauthProvider?.accessToken) {
            console.log(`❌ No access token found for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", "No access token found");
            return {
              id: post.id,
              success: false,
              error: "No access token found",
            };
          }

          console.log(`👤 Found user: ${project.user.id}`);

          // Post to Threads
          const threadsResult = await postToThreads(
            oauthProvider.accessToken,
            post.content,
            oauthProvider.pageId || ""
          );

          if (threadsResult.success) {
            console.log(
              `✅ Successfully posted to Threads for post ID: ${post.id}`
            );
            await updatePostStatus(post.id, "success");
            return { id: post.id, success: true };
          } else {
            console.log(`❌ Failed to post to Threads for post ID: ${post.id}`);
            await updatePostStatus(post.id, "failed", threadsResult.error);
            return {
              id: post.id,
              success: false,
              error: threadsResult.error,
            };
          }
        } catch (error) {
          console.error(
            `❌ Error processing Threads post ID: ${post.id}`,
            error
          );
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await updatePostStatus(post.id, "failed", errorMessage);
          return { id: post.id, success: false, error: errorMessage };
        }
      })
    );

    const redditResults = await Promise.all(
      redditPosts.map(async (post) => {
        const oauthProvider = getOAuthProviderForPlatform(post, "reddit");

        if (!oauthProvider) {
          console.log(
            `❌ No OAuth provider found for Reddit post ID: ${post.id}`
          );
          await updatePostStatus(post.id, "failed", "No OAuth provider found");
          return {
            id: post.id,
            success: false,
            error: "No OAuth provider found",
          };
        }

        const response = await postToSocial({
          oauth: oauthProvider,
          post,
        });
        return response;
      })
    );

    const allResults = [
      ...twitterResults,
      ...facebookResults,
      ...linkedinResults,
      ...threadsResults,
      ...redditResults,
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
 * Post content to Facebook Page
 */
async function postToFacebook(
  accessToken: string,
  content: string,
  pageId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("📘 Posting to Facebook API");

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
  pageId: string,
  accessToken: string,
  expiresAt: number,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("📘 Posting to Linkedin page : ", pageId);

    // Post to the Linkedin page
    const l = new Linkedin({ accessToken, expiresAt });
    const data = await l.postToPage(pageId, content);
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

/**
 * Post content to Threads
 * This is a two-step process:
 * 1. Create a media container
 * 2. Publish the container
 */
async function postToThreads(
  accessToken: string,
  content: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("🧵 Posting to Threads API");

    // Step 1: Create media container
    const createResponse = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads`,
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

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      console.error("❌ Threads container creation error:", errorData);
      return {
        success: false,
        error: `Failed to create container: ${createResponse.status} ${createResponse.statusText}`,
      };
    }

    const containerData = await createResponse.json();
    const containerId = containerData.id;

    if (!containerId) {
      return {
        success: false,
        error: "Failed to get container ID from creation response",
      };
    }

    console.log("✅ Container created successfully:", containerId);

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.threads.net/v1.0/${userId}/threads_publish`,
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
        error: `Failed to publish: ${publishResponse.status} ${publishResponse.statusText}`,
      };
    }

    const publishData = await publishResponse.json();
    console.log("✅ Successfully published to Threads:", publishData);

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
