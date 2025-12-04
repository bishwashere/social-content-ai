import { decryptToken, encryptToken } from "@/backend-apis/encryption";
import axios, { AxiosInstance } from "axios";

export interface Subreddit {
  id: string;
  title: string;
  display_name_prefixed: string;
  icon_img: string | null;
  is_personal: boolean;
  display_name: string;
}

export type NewToken = {
  accessToken: string;
  expiresAt: number;
};

/**
 * Options to submit a post to Reddit
 */
interface SubmitPostOptions {
  subreddit: string; // e.g. "javascript" or "u/yourusername"
  title: string;
  text?: string; // For text (self) posts
  url?: string; // For link posts or image posts
  kind?: "self" | "link" | "image"; // Defaults to "self"
  flairId?: string; // Optional flair
  nsfw?: boolean; // Optional NSFW flag
  spoiler?: boolean; // Optional spoiler flag
}

class Reddit {
  private _accessToken: string;
  private _client: AxiosInstance;
  private _expiresAt: number;
  private _refreshToken: string;
  private _clientId = process.env.AUTH_REDDIT_ID;
  private _clientSecret = process.env.AUTH_REDDIT_SECRET;
  private _userAgent = "web:nextpostai:v1.0 (by /u/jrTilak)";
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
      baseURL: "https://oauth.reddit.com",
      headers: {
        Authorization: `Bearer ${this._accessToken}`,
        "User-Agent": this._userAgent,
      },
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
    const response = await axios.post(
      "https://www.reddit.com/api/v1/access_token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this._refreshToken,
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${this._clientId}:${this._clientSecret}`).toString(
              "base64"
            ),
        },
      }
    );

    this._accessToken = response.data.access_token;
    this._expiresAt = Date.now() + response.data.expires_in * 1000;
  }

  /**
   * Get subreddits the user moderates.
   */
  async getModeratedSubreddits(): Promise<{
    data: Subreddit[];
    newToken: NewToken | null;
  }> {
    try {
      await this._ensureAccessTokenValid();
      const response = await this._client.get("/subreddits/mine/moderator");

      return {
        data: response.data.data.children.map((child: { data: Subreddit }) => ({
          ...child.data,
          is_personal: child.data.display_name_prefixed.startsWith("u/"),
        })),
        newToken: this._isAccessTokenRefreshed
          ? {
              accessToken: encryptToken(this._accessToken),
              expiresAt: this._expiresAt,
            }
          : null,
      };
    } catch (error) {
      console.log(error);
      return {
        data: [],
        newToken: null,
      };
    }
  }

  /**
   * Submit a post to a subreddit or user profile
   */
  async submitPost(options: SubmitPostOptions): Promise<{
    data: any;
    newToken: NewToken | null;
  }> {
    console.log("Submitting post to Reddit", options);
    await this._ensureAccessTokenValid();

    const {
      subreddit,
      title,
      text,
      url,
      kind = "self",
      flairId,
      nsfw = false,
      spoiler = false,
    } = options;

    const form = new URLSearchParams();
    form.append("sr", subreddit); // subreddit or u/username
    form.append("title", title);
    form.append("kind", kind);

    if (kind === "self" && text) form.append("text", text);
    if ((kind === "link" || kind === "image") && url) form.append("url", url);
    if (flairId) form.append("flair_id", flairId);
    if (nsfw) form.append("nsfw", "true");
    if (spoiler) form.append("spoiler", "true");
    form.append("resubmit", "true");
    form.append("api_type", "json");

    const res = await this._client.post("/api/submit", form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (res.data?.json?.errors?.length > 0) {
      throw new Error(
        "Post submission failed: " + JSON.stringify(res.data.json.errors)
      );
    }

    console.log(res.data.json);

    return {
      data: res.data.json,
      newToken: this._isAccessTokenRefreshed
        ? {
            accessToken: encryptToken(this._accessToken),
            expiresAt: this._expiresAt,
          }
        : null,
    };
  }
}

export { Reddit };
