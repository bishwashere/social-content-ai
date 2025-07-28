/**
 * Library for handling Twitter authentication and token refresh
 */

import { prisma } from "@/lib/prisma";

/**
 * Response from Twitter token refresh
 */
type TwitterTokenRefreshResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

/**
 * Refreshed token data
 */
export type RefreshedTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

/**
 * Check if a Twitter token is expired
 */
export const isTokenExpired = (expiresAt: number): boolean => {
  const currentTime = Math.floor(Date.now() / 1000);
  console.log(
    `⏰ Token expires at: ${new Date(expiresAt * 1000).toISOString()}`
  );
  console.log(`⏰ Current time: ${new Date(currentTime * 1000).toISOString()}`);
  console.log(`⏰ Time difference: ${expiresAt - currentTime} seconds`);

  return expiresAt <= currentTime;
};

/**
 * Refresh a Twitter access token using the refresh token
 */
export const refreshTwitterToken = async (
  refreshToken: string
): Promise<RefreshedTokens> => {
  console.log("🔄 Starting Twitter token refresh process");

  const clientId = process.env.AUTH_TWITTER_ID;
  const clientSecret = process.env.AUTH_TWITTER_SECRET;

  if (!clientId || !clientSecret) {
    console.error("❌ Twitter API credentials missing");
    throw new Error("Twitter API credentials not configured");
  }

  console.log("🔑 Twitter API credentials found");

  // Twitter OAuth 2.0 token endpoint
  const tokenUrl = "https://api.twitter.com/2/oauth2/token";

  try {
    console.log("📤 Sending refresh token request to Twitter API");
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${clientId}:${clientSecret}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Twitter token refresh failed:", errorData);
      console.error(
        `❌ HTTP Status: ${response.status}, Status Text: ${response.statusText}`
      );
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    console.log("✅ Twitter API responded successfully");
    const data = (await response.json()) as TwitterTokenRefreshResponse;
    console.log("📦 Received new token data from Twitter");

    const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

    console.log(
      `⏰ New token expires in: ${
        data.expires_in
      } seconds, data: ${JSON.stringify(data)}`
    );

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided
      expiresAt,
    };
  } catch (error) {
    console.error("❌ Error refreshing Twitter token:", error);
    throw error;
  }
};

/**
 * Check and refresh Twitter tokens if needed
 */
export const checkAndRefreshTwitterToken = async (
  userId: string
): Promise<{
  success: boolean;
  accessToken?: string;
  error?: string;
}> => {
  console.log(`🔍 Checking Twitter tokens for user: ${userId}`);

  try {
    const oauthData = await prisma.oauthProvider.findFirst({
      where: {
        userId: userId,
        platform: "twitter",
      },
    });

    if (!oauthData) {
      console.log(`❌ No Twitter OAuth data found for user: ${userId}`);
      return { success: false, error: "No Twitter authentication found" };
    }

    console.log(`✅ Found Twitter OAuth data for user: ${userId}`);

    // Check if token is expired
    if (isTokenExpired(oauthData.expiresAt || 0)) {
      console.log("⚠️ Twitter token expired, attempting to refresh");

      if (!oauthData.refreshToken) {
        console.error("❌ No refresh token available");
        return { success: false, error: "No refresh token available" };
      }

      try {
        // Refresh the token
        const refreshedTokens = await refreshTwitterToken(
          oauthData.refreshToken
        );

        // Update the tokens in the database
        console.log("💾 Updating tokens in database");
        await prisma.oauthProvider.update({
          where: {
            id: oauthData.id,
          },
          data: {
            accessToken: refreshedTokens.accessToken,
            refreshToken: refreshedTokens.refreshToken,
            expiresAt: refreshedTokens.expiresAt,
          },
        });

        console.log("✅ Twitter token refreshed and updated in database");
        return { success: true, accessToken: refreshedTokens.accessToken };
      } catch (refreshError) {
        console.error("❌ Failed to refresh Twitter token:", refreshError);
        return {
          success: false,
          error:
            refreshError instanceof Error
              ? refreshError.message
              : "Unknown error",
        };
      }
    }

    console.log("✅ Twitter token is still valid");
    return { success: true, accessToken: oauthData.accessToken };
  } catch (error) {
    console.error("❌ Error checking Twitter tokens:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
