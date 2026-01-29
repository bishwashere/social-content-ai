import NextAuth from "next-auth";
import TwitterProvider from "next-auth/providers/twitter";
import FacebookProvider from "next-auth/providers/facebook";
import TiktokProvider from "next-auth/providers/tiktok";
// import LinkedInProvider from "next-auth/providers/linkedin";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { verifyJWT } from "@/lib/jwt";
import RedditProvider from "next-auth/providers/reddit";
import { Reddit } from "./3rd-providers/reddit";
import { AUTH_ERROR_CODES } from "@/constants/auth-error";
import { OauthProvider } from "@prisma/client";
import { Fb } from "./3rd-providers/fb";
import { Twitter } from "./3rd-providers/twitter";
import { authenticateWithThreads } from "./auth/threads";
import { autoLinkProviderToAllProjects } from "@/server-actions/auto-link-oauth-providers";
import { encryptToken } from "@/backend-apis/encryption";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    FacebookProvider({
      clientId: process.env.AUTH_FACEBOOK_ID!,
      clientSecret: process.env.AUTH_FACEBOOK_SECRET!,
      authorization: {
        params: {
          scope: [
            "pages_manage_posts", // read and write posts for the given pages
            "public_profile", // read public profile information
            "pages_show_list", // read the list of pages that the user administers
            "pages_read_engagement", // to read the engagement metrics for the given pages
            "pages_read_user_content", // to read the content of the posts on the given pages
            "read_insights", // to read the insights for the given pages
          ].join(" "),
        },
      },
    }),
    RedditProvider({
      authorization: {
        params: {
          duration: "permanent", // to get the permanent access token
          scope: [
            "identity", // to get the user's identity
            "submit", // to submit posts to the user's subreddits
            "read", // to read the user's subreddits
            "modconfig", // to read the user's subreddit moderation configuration
            "mysubreddits", // to read the user's subreddits
          ].join(" "),
        },
        url: "https://www.reddit.com/api/v1/authorize.compact",
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "tweet.read tweet.write offline.access users.read",
        },
      },
    }),
    TiktokProvider({
      clientId: process.env.TIKTOK_CLIENT_ID!,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'user.info.basic',
            'user.info.stats',
            'video.list',
            'video.upload',
            'video.publish'
          ]
        },
      },
    }),
  ],
  pages: {
    error: "/error/auth",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account && user) {
        try {
          // Get the current user from your custom JWT token
          const cookieStore = cookies();
          const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

          if (!token) {
            return `/error/auth?code=${AUTH_ERROR_CODES.UNAUTHENTICATED}`;
          }

          const payload = verifyJWT(token, process.env.JWT_SECRET as string);

          if (!payload) {
            return `/error/auth?code=${AUTH_ERROR_CODES.UNAUTHENTICATED}`;
          }

          // Find the Google-authenticated user
          const googleUser = await prisma.user.findUnique({
            where: {
              id: payload.id,
              email: payload.email,
            },
          });

          if (!googleUser) {
            return `/error/auth?code=${AUTH_ERROR_CODES.UNAUTHENTICATED}`;
          }

          const platform = account.provider;

          if (!account.access_token) {
            return `/error/auth?code=${AUTH_ERROR_CODES.NO_ACCESS_TOKEN}`;
          }

          // store the auth provider to save or update later

          const authProviders: Omit<
            OauthProvider,
            "id" | "createdAt" | "updatedAt" | "pageFollowers"
          >[] = [];

          const encryptedTokens = { accessToken: '', refreshToken: '' };
          if (account.access_token) {
            encryptedTokens.accessToken = encryptToken(account.access_token);
          }
          if (account.refresh_token) {
            encryptedTokens.refreshToken = encryptToken(account.refresh_token);
          }

          // handle the auth provider
          switch (platform) {
            case "reddit":
              const r = new Reddit({
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken,
                expiresAt: account.expires_at!,
              });
              const { data } = await r.getModeratedSubreddits();

              const subreddits = data.filter(
                (subreddit) => !subreddit.is_personal
              );

              if (subreddits.length === 0) {
                return `/error/auth?code=${AUTH_ERROR_CODES.ZERO_SUBREDDITS}`;
              } else {
                // for each subreddit, create a new oauthProvider
                for (const subreddit of subreddits) {
                  authProviders.push({
                    userId: googleUser.id,
                    platform: "reddit",
                    pageId: subreddit.display_name || "",
                    accessToken: encryptedTokens.accessToken || "",
                    refreshToken: encryptedTokens.refreshToken || "",
                    expiresAt: account.expires_at || 0,
                    pageName: subreddit.title || "",
                    pageProfilePhoto: subreddit.icon_img || "",
                    isPersonal: subreddit.is_personal,
                  });
                }
              }
              break;

            case "facebook":
              const f = new Fb({
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken,
              });

              const longLivedTokens = await f.exchangeForLongLivedToken();

              if (!longLivedTokens) {
                return `/error/auth?code=${AUTH_ERROR_CODES.UNEXPECTED_ERROR}`;
              }

              const fbPages = await f.getMyPages();

              if (!fbPages || !fbPages.length) {
                return `/error/auth?code=${AUTH_ERROR_CODES.ZERO_FB_PAGES}`;
              }

              // for each fbPage, create a new oauthProvider
              for (const fbPage of fbPages) {
                authProviders.push({
                  userId: googleUser.id,
                  platform: "facebook",
                  pageId: fbPage.id,
                  accessToken: encryptToken(fbPage.accessToken),
                  refreshToken: "",
                  expiresAt: null,
                  pageName: fbPage.name,
                  pageProfilePhoto: fbPage.picture,
                  isPersonal: false,
                });
              }

              break;

            case "twitter":
              const t = new Twitter({
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken,
                expiresAt: account.expires_at!,
              });

              const profile = await t.getMyProfile();

              if (!profile) {
                return `/error/auth?code=${AUTH_ERROR_CODES.UNEXPECTED_ERROR}`;
              }

              const { cred: twitterCred, data: profileData } = profile;

              authProviders.push({
                userId: googleUser.id,
                platform: "twitter",
                pageId: profileData.id,
                accessToken: twitterCred.accessToken!,
                refreshToken: twitterCred.refreshToken!,
                expiresAt: twitterCred.expiresAt!,
                pageName: profileData.username,
                pageProfilePhoto: profileData.profile_image_url,
                isPersonal: true, // twitter is always personal
              });

              break;

            case "tiktok":
              authProviders.push({
                userId: googleUser.id,
                platform: "tiktok",
                pageId: String(account.open_id) || "",
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken,
                expiresAt: Number(account.expires_at) * 1000!,
                pageName: user.name || "",
                pageProfilePhoto: user.image || "",
                isPersonal: true, // tiktok is always personal
              });

              break;


            case "threads":
              authenticateWithThreads();

              break;
            default:
              return `/error/auth?code=${AUTH_ERROR_CODES.UNKNOWN_OAUTH_PROVIDER}`;
          }

          if (authProviders.length > 0) {
            //  for each authProvider, check if it already exists
            for (const authProvider of authProviders) {
              const existingProvider = await prisma.oauthProvider.findFirst({
                where: {
                  userId: googleUser.id,
                  platform: authProvider.platform,
                  pageId: authProvider.pageId,
                },
              });

              let providerId: string;
              if (existingProvider) {
                // Update the existing provider
                const updated = await prisma.oauthProvider.update({
                  where: {
                    id: existingProvider.id,
                  },
                  data: {
                    accessToken: authProvider.accessToken,
                    refreshToken: authProvider.refreshToken,
                    expiresAt: authProvider.expiresAt,
                    pageName: authProvider.pageName,
                    pageProfilePhoto: authProvider.pageProfilePhoto,
                    isPersonal: authProvider.isPersonal,
                    pageId: authProvider.pageId,
                  },
                });
                providerId = updated.id;
              } else {
                // Create a new provider
                const created = await prisma.oauthProvider.create({
                  data: authProvider,
                });
                providerId = created.id;
              }

              // Auto-link this provider to matching projects (background operation)
              autoLinkProviderToAllProjects(providerId, googleUser.id).catch(err => {
                console.error("Error auto-linking provider:", err);
              });
            }
            return true;
          }

          // Return true to allow the sign-in
          return true;
        } catch (error) {
          console.error(`Error linking ${account.provider} account:`, error);
          return `/error/auth?code=${AUTH_ERROR_CODES.UNEXPECTED_ERROR}`;
        }
      }
      return `/error/auth?code=${AUTH_ERROR_CODES.UNEXPECTED_ERROR}`;
    },
  },
});

/**
 * Helper function to get Twitter tokens for a user
 */
export async function getTwitterTokensForUser(userId: string) {
  const tokens = await prisma.oauthProvider.findFirst({
    where: {
      userId,
      platform: "twitter",
    },
  });

  return tokens;
}

/**
 * Helper function to get Facebook tokens for a user
 */
export async function getFacebookTokensForUser(userId: string) {
  const tokens = await prisma.oauthProvider.findFirst({
    where: {
      userId,
      platform: "facebook",
    },
  });

  return tokens;
}

/**
 * Helper function to get LinkedIn tokens for a user
 */
export async function getLinkedinTokensForUser(userId: string) {
  const tokens = await prisma.oauthProvider.findFirst({
    where: {
      userId,
      platform: "linkedin",
    },
  });

  return tokens;
}

/**
 * Helper function to get Threads tokens for a user
 */
export async function getThreadsTokensForUser(userId: string) {
  const tokens = await prisma.oauthProvider.findFirst({
    where: {
      userId,
      platform: "threads",
    },
  });

  return tokens;
}
