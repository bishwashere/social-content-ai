import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import Facebook from "next-auth/providers/facebook";
import LinkedIn from "next-auth/providers/linkedin";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { verifyJWT } from "@/lib/jwt";
import Threads from "next-auth/providers/threads";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      authorization: {
        url: "https://twitter.com/i/oauth2/authorize",
        params: {
          scope: "tweet.read tweet.write offline.access users.read",
        },
      },
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "pages_manage_posts,email,public_profile,pages_show_list,pages_read_engagement,pages_read_user_content,read_insights",
        },
      },
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid profile w_member_social email",
        },
      },
    }),
    Threads({
      clientId: process.env.THREADS_CLIENT_ID,
      clientSecret: process.env.THREADS_CLIENT_SECRET,
      authorization: {
        url: "https://www.threads.net/oauth/authorize",
        params: {
          scope:
            "threads_basic threads_content_publish threads_manage_insights",
        },
      },
      token: {
        url: "https://api.threads.net/oauth/token",
      },
      userinfo: {
        url: "https://api.threads.net/userinfo",
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account && user) {
        try {
          // Get the current user from your custom JWT token
          const cookieStore = cookies();
          const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value;

          if (!token) {
            console.error(
              "No auth token found, user not logged in with Google"
            );
            return false;
          }

          const payload = verifyJWT(token, process.env.JWT_SECRET as string);

          if (!payload) {
            console.error("Invalid token");
            return false;
          }

          // Find the Google-authenticated user
          const googleUser = await prisma.user.findUnique({
            where: {
              id: payload.id,
              email: payload.email,
            },
          });

          if (!googleUser) {
            console.error("Google user not found");
            return false;
          }

          const platform = account.provider;

          console.log(
            `Linking ${platform} account to Google user:`,
            googleUser.email
          );

          // Prepare the update data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updateData: any = {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at,
          };

          // If it's Facebook, get long-lived access token and page access token
          if (account.provider === "facebook" && account.access_token) {
            try {
              // Step 1: Exchange short-lived token for long-lived token
              const longLivedTokenResponse = await fetch(
                `https://graph.facebook.com/v22.0/oauth/access_token?` +
                  `grant_type=fb_exchange_token&` +
                  `client_id=${process.env.FACEBOOK_CLIENT_ID}&` +
                  `client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&` +
                  `fb_exchange_token=${account.access_token}`
              );
              const longLivedTokenData = await longLivedTokenResponse.json();

              if (longLivedTokenData.access_token) {
                console.log("Got long-lived access token", longLivedTokenData);

                // Step 2: Get user's Facebook pages
                const pagesResponse = await fetch(
                  `https://graph.facebook.com/v22.0/me/accounts?access_token=${longLivedTokenData.access_token}`
                );
                const pagesData = await pagesResponse.json();

                if (pagesData.data && pagesData.data.length > 0) {
                  // Get existing Facebook OAuth providers for this user
                  const existingProviders = await prisma.oauthProvider.findMany(
                    {
                      where: {
                        userId: googleUser.id,
                        platform: "facebook",
                      },
                    }
                  );

                  // Create a map of existing providers by pageId
                  const existingProviderMap = new Map(
                    existingProviders.map((provider) => [
                      provider.pageId,
                      provider,
                    ])
                  );

                  // Process each page
                  for (const page of pagesData.data) {
                    const existingProvider = existingProviderMap.get(page.id);

                    if (existingProvider) {
                      // Update existing provider
                      await prisma.oauthProvider.update({
                        where: { id: existingProvider.id },
                        data: {
                          accessToken: longLivedTokenData.access_token,
                          pageName: page.name,
                        },
                      });
                    } else {
                      // Create new provider
                      await prisma.oauthProvider.create({
                        data: {
                          userId: googleUser.id,
                          platform: "facebook",
                          accessToken: longLivedTokenData.access_token,
                          pageId: page.id,
                          pageName: page.name,
                          pageProfilePhoto: page.picture,
                        },
                      });
                    }
                  }

                  return true;
                } else {
                  console.log("No Facebook pages found for user");
                  return false;
                }
              } else {
                console.error(
                  "Failed to get long-lived token:",
                  longLivedTokenData
                );
                updateData.accessToken = account.access_token; // Fallback to short-lived token
              }
            } catch (error) {
              console.error("Error in Facebook token exchange:", error);
              updateData.accessToken = account.access_token; // Fallback to short-lived token
            }
          } else if (account.provider === "linkedin" && account.access_token) {
            // For LinkedIn, the access token is already suitable for personal posting
            console.log(
              "Stored LinkedIn access token for personal account posting"
            );
            updateData.accessToken = account.access_token;
          } else {
            // For Twitter, use the original access token
            updateData.accessToken = account.access_token;
          }

          // For non-Facebook platforms, handle OAuth provider creation/update
          if (platform !== "facebook") {
            // Store OAuth credentials for this user
            // Find existing provider
            const existingProvider = await prisma.oauthProvider.findFirst({
              where: {
                userId: googleUser.id,
                platform: platform as any,
              },
            });

            if (existingProvider) {
              await prisma.oauthProvider.update({
                where: { id: existingProvider.id },
                data: updateData,
              });
            } else {
              await prisma.oauthProvider.create({
                data: {
                  userId: googleUser.id,
                  platform: platform,
                  ...updateData,
                },
              });
            }
          }

          // Return true to allow the sign-in
          return true;
        } catch (error) {
          console.error(`Error linking ${account.provider} account:`, error);
          return false;
        }
      }
      return false;
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
