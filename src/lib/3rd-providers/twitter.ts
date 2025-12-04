import { decryptToken, encryptToken } from "@/backend-apis/encryption";
import axios, { AxiosInstance } from "axios";

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
