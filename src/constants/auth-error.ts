export const AUTH_ERROR = {
  UNAUTHENTICATED: {
    title: "Unauthenticated",
    description: "You are not authenticated. Please login first.",
  },
  ZERO_SUBREDDITS: {
    title: "No Subreddits found!",
    description:
      "You have no subreddits that you moderate. You need to moderate at least one subreddit to use this feature.",
  },
};

export const AUTH_ERROR_CODES = Object.fromEntries(
  Object.entries(AUTH_ERROR).map(([key]) => [key, key])
) as Record<keyof typeof AUTH_ERROR, keyof typeof AUTH_ERROR>;
