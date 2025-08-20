import axios, { AxiosInstance } from "axios";
import { detectMediaTypeFromUrl } from "../detect-media-type";
import { s3 } from "../s3";

type ConstructorProps = {
  accessToken: string;
  refreshToken: string;
};

type FbPage = {
  id: string;
  name: string;
  accessToken: string;
  picture: string;
};

class Fb {
  private _appId: string;
  private _appSecret: string;
  private _accessToken: string;
  private _refreshToken: string;
  private _baseUrl: string;
  private _client: AxiosInstance;

  constructor(oauth: ConstructorProps) {
    this._appId = process.env.AUTH_FACEBOOK_ID as string;
    this._appSecret = process.env.AUTH_FACEBOOK_SECRET as string;
    this._accessToken = oauth.accessToken;
    this._refreshToken = oauth.refreshToken;
    this._baseUrl = "https://graph.facebook.com/v23.0";

    this._client = axios.create({
      baseURL: this._baseUrl,
    });
  }

  /**
   * Exchange short-lived access token for long-lived access token
   */
  async exchangeForLongLivedToken() {
    const res = await this._client.get("/oauth/access_token", {
      params: {
        client_id: this._appId,
        client_secret: this._appSecret,
        grant_type: "fb_exchange_token",
        fb_exchange_token: this._accessToken,
      },
    });

    if (!res.data.access_token) return null;
    this._accessToken = res.data.access_token;

    return {
      cred: {
        accessToken: this._accessToken,
        refreshToken: this._refreshToken,
      },
    };
  }

  /**
   * Get pages that the user has access to
   * @returns Array of pages that the user has access to
   */
  async getMyPages() {
    const res = await this._client.get("/me/accounts", {
      params: {
        access_token: this._accessToken,
      },
    });

    if (!res.data.data) return null;

    return res.data.data?.map((page: any) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
      picture: page.picture?.data?.url,
    })) as FbPage[];
  }

  private _getMyPostInsightsApiUrl(pageId: string) {
    return (
      this._baseUrl +
      "/" +
      pageId +
      "/posts?fields=id,message,shares,created_time,reactions.type(LIKE).summary(total_count).limit(0),comments.summary(total_count).limit(0),insights.metric(post_impressions,post_impressions_unique)&access_token=" +
      this._accessToken
    );
  }

  async getMyPostInsights(pageId: string) {
    try {
      const url = this._getMyPostInsightsApiUrl(pageId);

      if (!url) return [];

      let posts: {
        id: string;
        message: string;
        created_time: string;
        shares: number;
        reactions: {
          summary: {
            total_count: number;
          };
        };
        comments: {
          summary: {
            total_count: number;
          };
        };
        insights: {
          data: {
            name: "post_impressions" | "post_impressions_unique";
            title: string;
            values: [
              {
                value: number;
              }
            ];
          }[];
        };
      }[] = [];
      let nextUrl = url;
      // get all the posts
      while (true) {
        const { data } = await axios.get(nextUrl);
        if (data.data?.length === 0) {
          break;
        } else {
          posts = [...posts, ...data.data];
          const nextPaging = data.paging?.next;
          if (nextPaging) {
            nextUrl = nextPaging;
          } else {
            break;
          }
        }
      }
      const normalizedData = posts.map((post) => ({
        id: post.id,
        message: post.message,
        date: new Date(post.created_time),
        shares: post.shares || 0,
        reactions: post.reactions?.summary?.total_count,
        comments: post.comments?.summary?.total_count,
        impressions: post.insights?.data?.find(
          (item) => item.name === "post_impressions"
        )?.values?.[0]?.value,
        uniqueImpressions: post.insights?.data?.find(
          (item) => item.name === "post_impressions_unique"
        )?.values?.[0]?.value,
      }));

      return normalizedData;
    } catch {
      return [];
    }
  }

  async postToFacebook(
    content: string,
    pageId: string,
    mediaUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log("📘 Posting to Facebook API");

      // Step 2: Determine endpoint and payload
      let endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;
      let payload: Record<string, string> = {
        access_token: this._accessToken,
      };

      if (mediaUrl) {
        const signedUrl = await s3.getSignedUrlForVideoDownload(mediaUrl);

        const mediaType = detectMediaTypeFromUrl(signedUrl);

        if (mediaType === "img") {
          endpoint = `https://graph.facebook.com/v18.0/${pageId}/photos`;
          payload = {
            url: signedUrl,
            caption: content,
            access_token: this._accessToken,
          };
        } else if (mediaType === "video") {
          endpoint = `https://graph.facebook.com/v18.0/${pageId}/videos`;
          payload = {
            file_url: signedUrl,
            description: content,
            access_token: this._accessToken,
          };
        } else {
          // fallback to feed if media type is unknown
          payload.message = content;
        }
      } else {
        // No media, just a text post
        payload.message = content;
      }

      console.log(payload);

      // Step 3: Post to Facebook
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Facebook API error:", errorData);
        return {
          success: false,
          error: `Facebook API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log("✅ Successfully posted to Facebook:", data);

      return { success: true };
    } catch (error) {
      console.error("❌ Error posting to Facebook:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error posting to Facebook",
      };
    }
  }
}

export { Fb };
