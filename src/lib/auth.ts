import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
import Facebook from "next-auth/providers/facebook";
import { UserModel } from "@/db/auth/schema/user";
import { OauthProvidersModel } from "@/db/oauth-providers/schema";
import connectToDb from "@/db/connect";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { verifyJWT } from "@/lib/jwt";

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
          scope: "pages_manage_posts,email,public_profile,pages_show_list",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account && user) {
        try {
          await connectToDb();

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
          const googleUser = await UserModel.findOne({
            _id: payload._id,
            email: payload.email,
          });

          if (!googleUser) {
            console.error("Google user not found");
            return false;
          }

          const platform =
            account.provider === "twitter" ? "twitter" : "facebook";

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

                console.log("pagesData", pagesData);

                if (pagesData.data && pagesData.data.length > 0) {
                  // Step 3: Use the first page's access token (which is long-lived for pages)
                  const firstPage = pagesData.data[0];
                  updateData.accessToken = firstPage.access_token; // Page access token
                  updateData.facebookPageId = firstPage.id;

                  console.log(
                    "Stored Facebook page access token for page:",
                    firstPage.name
                  );
                  console.log("Page ID:", firstPage.id);
                } else {
                  console.log("No Facebook pages found for user");
                  // Fallback to long-lived user token if no pages
                  updateData.accessToken = longLivedTokenData.access_token;
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
          } else {
            // For Twitter, use the original access token
            updateData.accessToken = account.access_token;
          }

          // Store OAuth credentials for this user
          await OauthProvidersModel.findOneAndUpdate(
            {
              userId: googleUser._id,
              platform: platform,
            },
            {
              $set: updateData,
            },
            { upsert: true }
          );

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
  await connectToDb();

  const tokens = await OauthProvidersModel.findOne({
    userId,
    platform: "twitter",
  });

  return tokens;
}

/**
 * Helper function to get Facebook tokens for a user
 */
export async function getFacebookTokensForUser(userId: string) {
  await connectToDb();

  const tokens = await OauthProvidersModel.findOne({
    userId,
    platform: "facebook",
  });

  return tokens;
}
