import { getFacebookTokensForUser } from "./auth";

export type FacebookMetrics = {
  commentCount: number;
  likeCount: number;
  date: string;
};

export const extractFacebookPostId = (url: string): { id: string | null; isShareUrl: boolean } => {
  try {
    const parsedUrl = new URL(url);

    // Case 1: /posts/{postId}
    const postsMatch = url.match(/\/posts\/(\d+)/i);
    if (postsMatch) return { id: postsMatch[1], isShareUrl: false };

    // Case 2: permalink.php?story_fbid={postId}
    if (parsedUrl.pathname === "/permalink.php") {
      const storyFbid = parsedUrl.searchParams.get("story_fbid");
      if (storyFbid) return { id: storyFbid, isShareUrl: false };
    }

    // Case 3: /share/p/{postId}
    const shareMatch = url.match(/\/share\/p\/([a-zA-Z0-9]+)/i);
    if (shareMatch) return { id: shareMatch[1], isShareUrl: true };

    console.error("Unsupported Facebook URL format:", url);
    return { id: null, isShareUrl: false };
  } catch (error) {
    console.error("Error parsing Facebook URL:", error);
    return { id: null, isShareUrl: false };
  }
};

const REQUIRED_PERMISSIONS = [
  'pages_read_engagement',
  'pages_manage_posts',
  'pages_show_list'
];

/**
 * Validates if the Facebook access token has the required permissions
 */
const validateFacebookPermissions = async (accessToken: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/permissions?access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error('Error fetching permissions:', await response.text());
      return false;
    }

    const { data } = await response.json();
    const grantedPermissions = data
      .filter((perm: { status: string }) => perm.status === 'granted')
      .map((perm: { permission: string }) => perm.permission);

    const missingPermissions = REQUIRED_PERMISSIONS.filter(
      perm => !grantedPermissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      console.error('Missing Facebook permissions:', missingPermissions.join(', '));
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating Facebook permissions:', error);
    return false;
  }
};

export const getFacebookPostMetrics = async (
  url: string,
  userId: string
): Promise<FacebookMetrics | null> => {
  const tokens = await getFacebookTokensForUser(userId);
  if (!tokens?.accessToken || !tokens?.facebookPageId) {
    console.error('Facebook tokens not found or incomplete');
    return null;
  }

  const hasValidPermissions = await validateFacebookPermissions(tokens.accessToken);
  if (!hasValidPermissions) {
    console.error('Facebook permissions validation failed');
    return null;
  }

  const { id: postId, isShareUrl } = extractFacebookPostId(url);
  if (!postId) {
    console.error("Invalid Facebook URL:", url);
    return null;
  }

  // For share URLs, we don't need to prefix with page ID
  const fullPostId = isShareUrl ? postId : `${tokens.facebookPageId}_${postId}`;
  const response = await fetch(
      `https://graph.facebook.com/v23.0/${fullPostId}?fields=comments.summary(true),likes.summary(true),created_time&access_token=${tokens.accessToken}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      const errorCode = errorData.error?.code;
      const errorMessage = errorData.error?.message;

      switch (errorCode) {
        case 100:
          console.error(`Facebook API Error: Post not found or not accessible - ${errorMessage}`);
          break;
        case 190:
          console.error(`Facebook API Authentication Error: Invalid or expired access token - ${errorMessage}`);
          break;
        case 200:
          console.error(`Facebook API Permission Error: Missing required permissions - ${errorMessage}`);
          break;
        case 803:
          console.error(`Facebook API Error: Invalid or malformed post ID - ${errorMessage}`);
          break;
        default:
          console.error(`Facebook API Error (${errorCode}): ${errorMessage}`);
      }
      return null;
    }

  const data = await response.json();
  return {
    commentCount: data.comments?.summary?.total_count ?? 0,
    likeCount: data.likes?.summary?.total_count ?? 0,
    date: data.created_time,
  };
};
