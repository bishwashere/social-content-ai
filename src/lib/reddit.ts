// utils/redditClient.ts

export interface Subreddit {
  id: string;
  name: string;
  title: string;
  icon_img: string | null;
  subscribers: number;
  over18: boolean;
  user_is_moderator: boolean;
}

export interface RedditAPIResponse {
  kind: string;
  data: {
    children: { kind: string; data: Subreddit }[];
  };
}

/**
 * Fetch subreddits the user moderates using Reddit API.
 * @param accessToken OAuth2 access token for the user.
 * @returns Promise resolving to array of moderated subreddits.
 */
export async function getModeratedSubreddits(
  accessToken: string
): Promise<Subreddit[]> {
  const response = await fetch(
    "https://oauth.reddit.com/subreddits/mine/moderator",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "MyApp/1.0 by my_reddit_username",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Reddit API error: ${response.status} ${response.statusText}`
    );
  }

  const json: RedditAPIResponse = await response.json();

  return json.data.children.map((child) => child.data);
}
