import { getFacebookTokensForUser } from "./auth";

export type FacebookMetrics = {
  commentCount: number;
  likeCount: number;
  id: string;
  message: string;
};

import { https } from "follow-redirects";
import { URL } from "url";

/**
 * Supports Facebook URLs:
 * - /posts/{postId}
 * - /permalink.php?story_fbid={postId}&id={pageId}
 * - /share/p/{shortcode} (follows redirect to resolve real post ID)
 */
export const extractFacebookPostId = async (
  url: string
): Promise<{ id: string | null; fbId?: string }> => {
  try {
    const parsedUrl = new URL(url);

    // Case 1: /posts/{postId}
    const postsMatch = parsedUrl.pathname.match(/\/posts\/(\d+)/i);
    if (postsMatch) return { id: postsMatch[1] };

    // Case 2: permalink.php?story_fbid={postId}&id={pageId}
    if (parsedUrl.pathname === "/permalink.php") {
      const storyFbid = parsedUrl.searchParams.get("story_fbid");
      const fbId = parsedUrl.searchParams.get("id");
      if (storyFbid) return { id: storyFbid, fbId: fbId ?? undefined };
    }

    // Case 3: /share/p/{shortcode} – follow redirect to get real URL
    const shareMatch = parsedUrl.pathname.match(/\/share\/p\/([a-zA-Z0-9]+)/i);
    console.log("shareMatch", shareMatch);
    if (shareMatch) {
      return new Promise((resolve) => {
        https
          .get(url, (res) => {
            const finalUrl = res.responseUrl || res.headers.location;
            if (!finalUrl) return resolve({ id: null });

            try {
              const finalParsed = new URL(finalUrl);

              const finalPostMatch =
                finalParsed.pathname.match(/\/posts\/(\d+)/);
              if (finalPostMatch) return resolve({ id: finalPostMatch[1] });

              if (finalParsed.pathname === "/permalink.php") {
                const storyFbid = finalParsed.searchParams.get("story_fbid");
                const fbId = finalParsed.searchParams.get("id");
                if (storyFbid)
                  return resolve({ id: storyFbid, fbId: fbId ?? undefined });
              }

              const compositeMatch = finalParsed.pathname.match(/\/(\d+_\d+)/);
              if (compositeMatch) return resolve({ id: compositeMatch[1] });

              return resolve({ id: null });
            } catch (err) {
              console.error(err);
              return resolve({ id: null });
            }
          })
          .on("error", () => resolve({ id: null }));
      });
    }

    console.error("Unsupported Facebook URL format:", url);
    return { id: null };
  } catch (error) {
    console.error("Error parsing Facebook URL:", error);
    return { id: null };
  }
};

const REQUIRED_PERMISSIONS = [
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_show_list",
];

/**
 * Validates if the Facebook access token has the required permissions
 */
const validateFacebookPermissions = async (
  accessToken: string
): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/permissions?access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error("Error fetching permissions:", await response.text());
      return false;
    }

    const { data } = await response.json();
    const grantedPermissions = data
      .filter((perm: { status: string }) => perm.status === "granted")
      .map((perm: { permission: string }) => perm.permission);

    const missingPermissions = REQUIRED_PERMISSIONS.filter(
      (perm) => !grantedPermissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      console.error(
        "Missing Facebook permissions:",
        missingPermissions.join(", ")
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating Facebook permissions:", error);
    return false;
  }
};

export const getFacebookPostMetrics = async (
  url: string,
  userId: string
): Promise<FacebookMetrics | null> => {
  const tokens = await getFacebookTokensForUser(userId);
  if (!tokens?.accessToken || !tokens?.facebookPageId) {
    console.error("Facebook tokens not found or incomplete");
    return null;
  }

  const { id: postId, fbId } = await extractFacebookPostId(url);
  if (!postId) {
    console.error("Invalid Facebook URL:", url);
    return null;
  }

  // For share URLs, we don't need to prefix with page ID
  const fullPostId = `${fbId || tokens.facebookPageId}_${postId}`;

  console.log("Full post id", fullPostId);

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${fullPostId}?fields=reactions.summary(total_count),comments.summary(total_count),message&access_token=${tokens.accessToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    const errorCode = errorData.error?.code;
    const errorMessage = errorData.error?.message;

    switch (errorCode) {
      case 100:
        console.error(
          `Facebook API Error: Post not found or not accessible - ${errorMessage}`
        );
        break;
      case 190:
        console.error(
          `Facebook API Authentication Error: Invalid or expired access token - ${errorMessage}`
        );
        break;
      case 200:
        console.error(
          `Facebook API Permission Error: Missing required permissions - ${errorMessage}`
        );
        break;
      case 803:
        console.error(
          `Facebook API Error: Invalid or malformed post ID - ${errorMessage}`
        );
        break;
      default:
        console.error(`Facebook API Error (${errorCode}): ${errorMessage}`);
    }
    return null;
  }

  const data = await response.json();
  return {
    commentCount: data.comments?.summary?.total_count ?? 0,
    likeCount: data.reactions?.summary?.total_count ?? 0,
    id: data.id,
    message: data.message,
  };
};
