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
  NO_ACCESS_TOKEN: {
    title: "Oauth Error",
    description:
      "The provider returned an error. Please try again, Check if you provided the requested permissions.",
  },
  UNEXPECTED_ERROR: {
    title: "Oauth Error",
    description:
      "An unexpected error occurred. Please try again later, if the problem persists, please contact us.",
  },
  UNKNOWN_OAUTH_PROVIDER: {
    title: "Oauth Error",
    description:
      "The provider is unknown. Please contact us if you think this is a bug.",
  },
  ZERO_FB_PAGES: {
    title: "No Facebook Pages found!",
    description:
      "You have no Facebook pages that you have access to. You need to have access to at least one page to use this feature.",
  },
};

export const AUTH_ERROR_CODES = Object.fromEntries(
  Object.entries(AUTH_ERROR).map(([key]) => [key, key])
) as Record<keyof typeof AUTH_ERROR, keyof typeof AUTH_ERROR>;
