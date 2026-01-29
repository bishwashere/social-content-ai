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
            // Instagram Business Account permissions
            "instagram_basic", // to access Instagram Business Account
            "instagram_content_publish", // to publish content to Instagram
            "instagram_manage_comments", // to manage comments on Instagram posts
            "instagram_manage_insights", // to read insights for Instagram
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
      console.log("🔐 [NextAuth signIn] Callback triggered for provider:", account?.provider);
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
                    isStandalone: subreddit.is_personal,
                  });
                }
              }
              break;

            case "facebook":
              console.log("📘 [Facebook OAuth] Starting Facebook OAuth flow for user:", googleUser.id);
              const f = new Fb({
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken,
              });

              console.log("📘 [Facebook OAuth] Exchanging for long-lived token...");
              const longLivedTokens = await f.exchangeForLongLivedToken();

              if (!longLivedTokens) {
                return `/error/auth?code=${AUTH_ERROR_CODES.UNEXPECTED_ERROR}`;
              }

              const fbPages = await f.getMyPages();
              console.log("📘 [Facebook OAuth] Pages fetched:", fbPages?.length || 0);

              if (!fbPages || !fbPages.length) {
                console.log("❌ [Facebook OAuth] No Facebook pages found!");
                return `/error/auth?code=${AUTH_ERROR_CODES.ZERO_FB_PAGES}`;
              }

              console.log("📘 [Facebook OAuth] Processing pages:", fbPages.map(p => ({ id: p.id, name: p.name })));

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
                  isStandalone: false,
                });

                // Check if this Facebook Page has a linked Instagram Business Account
                try {
                  console.log(`🔍 Checking Instagram for Facebook Page: ${fbPage.name} (ID: ${fbPage.id})`);
                  const igAccount = await f.getInstagramBusinessAccount(fbPage.id, fbPage.accessToken);
                  console.log(`📸 Instagram result for ${fbPage.name}:`, igAccount ? `@${igAccount.username} (ID: ${igAccount.id})` : 'null');
                  if (igAccount) {
                    console.log(`✅ Found Instagram Business Account for page ${fbPage.name}: @${igAccount.username}`);
                    authProviders.push({
                      userId: googleUser.id,
                      platform: "instagram",
                      pageId: igAccount.id, // Instagram Business Account ID (used for posting)
                      accessToken: encryptToken(fbPage.accessToken), // Use Facebook Page's access token
                      refreshToken: "",
                      expiresAt: null, // Page tokens don't expire
                      pageName: igAccount.username,
                      pageProfilePhoto: igAccount.profilePictureUrl || null,
                      isStandalone: false, // Business account linked to Facebook Page
                    });
                  }
                } catch (igError: any) {
                  console.error(`❌ Error fetching Instagram Business Account for page ${fbPage.name}:`, igError?.response?.data || igError?.message || igError);
                  // Continue with just the Facebook page
                }
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
                isStandalone: true, // twitter is always personal
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
                isStandalone: true, // tiktok is always personal
              });

              break;


            case "threads":
              authenticateWithThreads();

              break;
            default:
              return `/error/auth?code=${AUTH_ERROR_CODES.UNKNOWN_OAUTH_PROVIDER}`;
          }

          if (authProviders.length > 0) {
            console.log(`✅ [OAuth] Saving ${authProviders.length} auth providers to database:`, 
              authProviders.map(p => ({ platform: p.platform, pageId: p.pageId, pageName: p.pageName }))
            );
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
                console.log(`📝 [OAuth] Updating existing provider: ${authProvider.platform} - ${authProvider.pageName}`);
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
                    isStandalone: authProvider.isStandalone,
                    pageId: authProvider.pageId,
                  },
                });
                providerId = updated.id;
                console.log(`✅ [OAuth] Updated provider ID: ${providerId}`);
              } else {
                console.log(`📝 [OAuth] Creating new provider: ${authProvider.platform} - ${authProvider.pageName}`);
                // Create a new provider
                const created = await prisma.oauthProvider.create({
                  data: authProvider,
                });
                providerId = created.id;
                console.log(`✅ [OAuth] Created provider ID: ${providerId}`);
              }

              // Auto-link this provider to matching projects (background operation)
              autoLinkProviderToAllProjects(providerId, googleUser.id).catch(err => {
                console.error("Error auto-linking provider:", err);
              });
            }
            console.log("✅ [OAuth] All providers saved successfully!");
            return true;
          }

          // Return true to allow the sign-in
          return true;
        } catch (error: any) {
          console.error(`❌ [OAuth Error] Error linking ${account.provider} account:`, {
            message: error?.message,
            stack: error?.stack,
            response: error?.response?.data,
          });
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
