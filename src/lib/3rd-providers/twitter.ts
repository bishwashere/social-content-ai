import { decryptToken, encryptToken } from "@/backend-apis/encryption";
import axios, { AxiosInstance } from "axios";
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

type TwitterUser = {
  id: string;
  name: string;
  profile_image_url: string;
  username: string;
};

class Twitter {
  private _accessToken: string;
  private _client: AxiosInstance;
  private _expiresAt: number;
  private _refreshToken: string;
  private _clientId = process.env.AUTH_TWITTER_ID;
  private _clientSecret = process.env.AUTH_TWITTER_SECRET;
  private _isAccessTokenRefreshed = false;

  constructor(args: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  }) {
    this._accessToken = decryptToken(args.accessToken);
    this._refreshToken = decryptToken(args.refreshToken);
    this._expiresAt = args.expiresAt;

    this._client = axios.create({
      baseURL: "https://api.twitter.com",
    });
  }

  private async _ensureAccessTokenValid(): Promise<void> {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (this._expiresAt - now < fiveMinutes) {
      await this._refreshAccessToken();
      this._isAccessTokenRefreshed = true;
    }
  }

  private async _refreshAccessToken(): Promise<void> {
    try {
      console.log("📤 Sending refresh token request to Twitter API");

      const res = await this._client.post(
        "/2/oauth2/token",
        {
          grant_type: "refresh_token",
          refresh_token: this._refreshToken,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${this._clientId}:${this._clientSecret}`,
          },
        }
      );

      const data: TwitterTokenRefreshResponse = res.data;

      this._accessToken = data.access_token;
      this._expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
    } catch {
      return;
    }
  }

  async getMyProfile() {
    try {
      await this._ensureAccessTokenValid();
      const res = await this._client.get("/2/users/me", {
        headers: {
          Authorization: `Bearer ${this._accessToken}`,
        },
        params: {
          "user.fields": "id,name,profile_image_url",
        },
      });
      return {
        cred: {
          accessToken: encryptToken(this._accessToken),
          expiresAt: this._expiresAt,
          refreshToken: encryptToken(this._refreshToken),
        },
        data: res.data as TwitterUser,
      };
    } catch {
      return null;
    }
  }
}

export { Twitter };

// ============================================
// Utility functions for Twitter token management
// ============================================

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
      refreshToken: data.refresh_token || refreshToken,
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

    if (isTokenExpired(oauthData.expiresAt || 0)) {
      console.log("⚠️ Twitter token expired, attempting to refresh");

      if (!oauthData.refreshToken) {
        console.error("❌ No refresh token available");
        return { success: false, error: "No refresh token available" };
      }

      try {
        const refreshedTokens = await refreshTwitterToken(
          oauthData.refreshToken
        );

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
