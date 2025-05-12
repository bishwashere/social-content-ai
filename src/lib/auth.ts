import NextAuth from "next-auth";
import Twitter from "next-auth/providers/twitter";
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

          console.log(
            "Linking Twitter account to Google user:",
            googleUser.email
          );

          // Store Twitter OAuth credentials for this user
          await OauthProvidersModel.findOneAndUpdate(
            {
              userId: googleUser._id,
              platform: "twitter",
            },
            {
              $set: {
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                expiresAt: account.expires_at,
              },
            },
            { upsert: true }
          );

          // Return true to allow the sign-in
          return true;
        } catch (error) {
          console.error("Error linking Twitter account:", error);
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
