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
    // Instagram Business API - Custom provider to handle non-standard OAuth response
    // Instagram doesn't return token_type in its response, so we need to handle it manually
    {
      id: "instagram",
      name: "Instagram",
      type: "oauth",
      clientId: process.env.AUTH_INSTAGRAM_ID!,
      clientSecret: process.env.AUTH_INSTAGRAM_SECRET!,
      authorization: {
        url: "https://www.instagram.com/oauth/authorize",
        params: {
          scope: "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights",
          response_type: "code",
        },
      },
      token: {
        url: "https://api.instagram.com/oauth/access_token",
        async request(context: any) {
          const { params, provider } = context;
          
          console.log("[Instagram OAuth] Starting token exchange...");
          console.log("[Instagram OAuth] Context keys:", Object.keys(context));
          console.log("[Instagram OAuth] Params:", JSON.stringify(params || {}));
          
          // Build the redirect URI - Instagram requires exact match
          const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.nextpostai.com";
          const redirectUri = `${baseUrl}/api/auth/callback/instagram`;
          
          console.log("[Instagram OAuth] Using redirect_uri:", redirectUri);
          console.log("[Instagram OAuth] Code present:", !!params?.code);
          
          const response = await fetch("https://api.instagram.com/oauth/access_token", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: provider.clientId as string,
              client_secret: provider.clientSecret as string,
              grant_type: "authorization_code",
              redirect_uri: redirectUri,
              code: params?.code as string || "",
            }),
          });

          const data = await response.json();
          console.log("[Instagram OAuth] Token response:", { 
            hasAccessToken: !!data.access_token, 
            userId: data.user_id,
            error: data.error_message || data.error_type,
            errorDescription: data.error_description
          });

          if (data.error_type || data.error_message || data.error) {
            console.error("[Instagram OAuth] Error:", data.error_message || data.error_type || data.error);
            throw new Error(data.error_message || data.error_description || data.error || "Instagram OAuth error");
          }

          // Instagram returns: { access_token, user_id, permissions }
          // next-auth expects a flat TokenSet object with token_type
          return {
            access_token: data.access_token,
            token_type: "bearer", // Add missing token_type required by next-auth
            user_id: data.user_id, // Pass through for use in signIn callback
          };
        },
      },
      userinfo: {
        url: "https://graph.instagram.com/me",
        async request(context: any) {
          const { tokens } = context;
          console.log("[Instagram OAuth] Fetching user info...");
          console.log("[Instagram OAuth] Has access_token:", !!tokens?.access_token);
          
          const response = await fetch(
            `https://graph.instagram.com/me?fields=id,username,account_type,name&access_token=${tokens?.access_token}`
          );
          const profile = await response.json();
          console.log("[Instagram OAuth] User profile:", { 
            id: profile.id, 
            username: profile.username,
            accountType: profile.account_type,
            error: profile.error?.message 
          });
          
          if (profile.error) {
            console.error("[Instagram OAuth] Profile error:", profile.error);
            throw new Error(profile.error.message || "Failed to fetch Instagram profile");
          }
          
          return profile;
        },
      },
      profile(profile: { id: string; name?: string; username?: string }) {
        return {
          id: profile.id,
          name: profile.name || profile.username,
          email: null, // Instagram doesn't provide email
          image: null,
        };
      },
    }
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

          const encryptedTokens = { accessToken: '', refreshToken:''};
          if(account.access_token) {
            encryptedTokens.accessToken = encryptToken(account.access_token);
          }
          if(account.refresh_token) {
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
                expiresAt: Number(account.expires_at)*1000!,
                pageName: user.name || "",
                pageProfilePhoto: user.image || "",
                isPersonal: true, // tiktok is always personal
              });

              break;

            case "instagram":
              console.log("[Instagram SignIn] Starting Instagram OAuth callback");
              console.log("[Instagram SignIn] Account data:", JSON.stringify({
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                user_id: account.user_id,
                hasAccessToken: !!account.access_token,
              }));
              console.log("[Instagram SignIn] User data:", JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email,
              }));
              
              // Instagram Business API - the user_id from the account is the Instagram Business Account ID
              // This is used for posting via the Instagram Graph API
              const instagramUserId = account.user_id || account.providerAccountId || user.id;
              
              if (!instagramUserId) {
                console.error("[Instagram SignIn] No Instagram user ID found in account");
                return `/error/auth?code=${AUTH_ERROR_CODES.UNEXPECTED_ERROR}`;
              }

              console.log("[Instagram SignIn] Using Instagram user ID:", instagramUserId);

              authProviders.push({
                userId: googleUser.id,
                platform: "instagram",
                pageId: String(instagramUserId),
                accessToken: encryptedTokens.accessToken,
                refreshToken: encryptedTokens.refreshToken || "",
                expiresAt: account.expires_at ? Number(account.expires_at) * 1000 : null,
                pageName: user.name || "Instagram Account",
                pageProfilePhoto: user.image || "",
                isPersonal: true, // Instagram Business accounts are tied to a user
              });

              console.log("[Instagram SignIn] Provider added to save queue");
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
