import axios, { AxiosInstance } from "axios";
import { detectMediaTypeFromUrl } from "../detect-media-type";
import { s3 } from "../s3";
import { decryptToken, encryptToken } from "@/backend-apis/encryption";

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
    this._accessToken = decryptToken(oauth.accessToken);
    this._refreshToken = oauth.refreshToken ? decryptToken(oauth.refreshToken) : oauth.refreshToken;
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

  /**
   * Get Instagram Business Account ID linked to a Facebook Page
   * @param pageId - Facebook Page ID
   * @param pageAccessToken - Page's access token
   * @returns Instagram Business Account ID and username, or null if not linked
   */
  async getInstagramBusinessAccount(pageId: string, pageAccessToken: string): Promise<{
    id: string;
    username: string;
    profilePictureUrl?: string;
  } | null> {
    try {
      // First, get the Instagram Business Account ID
      const res = await this._client.get(`/${pageId}`, {
        params: {
          fields: "instagram_business_account",
          access_token: pageAccessToken,
        },
      });

      const igAccountId = res.data?.instagram_business_account?.id;
      if (!igAccountId) {
        return null;
      }

      // Then, get the Instagram account details
      const igRes = await this._client.get(`/${igAccountId}`, {
        params: {
          fields: "id,username,profile_picture_url",
          access_token: pageAccessToken,
        },
      });

      return {
        id: igRes.data?.id,
        username: igRes.data?.username || "",
        profilePictureUrl: igRes.data?.profile_picture_url,
      };
    } catch (error) {
      console.error("Error getting Instagram Business Account:", error);
      return null;
    }
  }

  private _getMyPostInsightsApiUrl(pageId: string) {
    // For v3.3+, many fields are deprecated when requesting posts
    // Use minimal fields only - fetch everything else separately
    const fields = [
      "id",
      "message",
      "created_time",
      // Removed: shares, reactions, comments, insights - all deprecated in v3.3+
      // Will fetch all metrics separately for each post
    ].join(",");
    
    return (
      this._baseUrl +
      "/" +
      pageId +
      "/posts?fields=" + fields + "&access_token=" +
      this._accessToken
    );
  }

  async getMyPostInsights(pageId: string) {
    try {
      const url = this._getMyPostInsightsApiUrl(pageId);

      if (!url) {
        console.error("[Fb.getMyPostInsights] Failed to generate API URL. Check access token and pageId:", {
          pageId,
          hasAccessToken: !!this._accessToken,
          baseUrl: this._baseUrl,
        });
        return [];
      }
      
      console.log("[Fb.getMyPostInsights] Fetching posts from:", url.substring(0, 100) + "...");

      let posts: {
        id: string;
        message?: string;
        created_time: string;
        shares?: {
          count: number;
        };
        type?: string;
        permalink_url?: string;
        full_picture?: string;
        link?: string;
        story?: string;
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
        try {
          const { data } = await axios.get(nextUrl);
          
          if (data.error) {
            console.error("[Fb.getMyPostInsights] Facebook API error:", data.error);
            throw new Error(`Facebook API error: ${data.error.message || JSON.stringify(data.error)}`);
          }
          
          if (data.data?.length === 0) {
            console.log("[Fb.getMyPostInsights] No more posts in pagination");
            break;
          } else if (data.data) {
            posts = [...posts, ...data.data];
            console.log(`[Fb.getMyPostInsights] Fetched ${data.data.length} posts (total so far: ${posts.length})`);
          } else {
            console.warn("[Fb.getMyPostInsights] Unexpected API response structure:", data);
            break;
          }
          
          const nextPaging = data.paging?.next;
          if (nextPaging) {
            nextUrl = nextPaging;
          } else {
            break;
          }
        } catch (axiosError: any) {
          console.error("[Fb.getMyPostInsights] Axios error:", {
            message: axiosError.message,
            status: axiosError.response?.status,
            statusText: axiosError.response?.statusText,
            data: axiosError.response?.data,
            errorMessage: axiosError.response?.data?.error?.message,
            errorType: axiosError.response?.data?.error?.type,
            errorCode: axiosError.response?.data?.error?.code,
            fullError: JSON.stringify(axiosError.response?.data, null, 2),
          });
          throw axiosError;
        }
      }
      // Fetch reactions, comments, shares, and insights separately for each post (deprecated aggregated fields removed)
      const normalizedData = await Promise.all(
        posts.map(async (post) => {
          let reactions = 0;
          let comments = 0;
          let shares = 0;
          let impressions: number | undefined;
          let uniqueImpressions: number | undefined;
          
          // Fetch reactions count separately
          try {
            const reactionsUrl = `${this._baseUrl}/${post.id}?fields=reactions.summary(total_count)&access_token=${this._accessToken}`;
            const reactionsResponse = await axios.get(reactionsUrl);
            reactions = reactionsResponse.data?.reactions?.summary?.total_count || 0;
          } catch {
            // Silently fail - not critical
            console.warn(`[Fb.getMyPostInsights] Failed to fetch reactions for post ${post.id}`);
          }
          
          // Fetch comments count separately
          try {
            const commentsUrl = `${this._baseUrl}/${post.id}?fields=comments.summary(total_count)&access_token=${this._accessToken}`;
            const commentsResponse = await axios.get(commentsUrl);
            comments = commentsResponse.data?.comments?.summary?.total_count || 0;
          } catch {
            // Silently fail - not critical
            console.warn(`[Fb.getMyPostInsights] Failed to fetch comments for post ${post.id}`);
          }
          
          // Fetch shares count separately
          try {
            const sharesUrl = `${this._baseUrl}/${post.id}?fields=shares&access_token=${this._accessToken}`;
            const sharesResponse = await axios.get(sharesUrl);
            shares = sharesResponse.data?.shares?.count || 0;
          } catch {
            // Silently fail - not critical
            console.warn(`[Fb.getMyPostInsights] Failed to fetch shares for post ${post.id}`);
          }
          
          // Fetch insights separately
          try {
            const insightsUrl = `${this._baseUrl}/${post.id}/insights?metric=post_impressions,post_impressions_unique&access_token=${this._accessToken}`;
            const insightsResponse = await axios.get(insightsUrl);
            const insightsData = insightsResponse.data?.data || [];
            
            impressions = insightsData.find(
              (item: any) => item.name === "post_impressions"
            )?.values?.[0]?.value;
            uniqueImpressions = insightsData.find(
              (item: any) => item.name === "post_impressions_unique"
            )?.values?.[0]?.value;
            
            // Log impression data for debugging
            console.log(`[Fb.getMyPostInsights] Post ${post.id} impressions:`, {
              impressions,
              uniqueImpressions,
              rawInsightsData: insightsData.length > 0 ? insightsData.map((i: any) => ({ name: i.name, value: i.values?.[0]?.value })) : "no data",
            });
          } catch (insightsError: any) {
            // Log the actual error for debugging
            console.warn(`[Fb.getMyPostInsights] Failed to fetch insights for post ${post.id}:`, {
              message: insightsError.message,
              status: insightsError.response?.status,
              errorData: insightsError.response?.data?.error,
            });
            // Set to 0 instead of undefined so we know insights were attempted
            impressions = 0;
            uniqueImpressions = 0;
          }
          
          return {
            id: post.id,
            message: post.message,
            date: new Date(post.created_time),
            shares,
            reactions,
            comments,
            impressions,
            uniqueImpressions,
            // Additional metadata (these should still work)
            postType: post.type || undefined,
            permalinkUrl: post.permalink_url || undefined,
            fullPictureUrl: post.full_picture || undefined,
            linkUrl: post.link || undefined,
            story: post.story || undefined,
          };
        })
      );

      return normalizedData;
    } catch (error) {
      console.error("[Fb.getMyPostInsights] Error fetching posts:", error);
      // Re-throw to let caller handle the error
      throw error;
    }
  }

  /**
   * Fetch detailed insights for a specific post
   * This requires a separate API call per post
   */
  async getPostDetailedInsights(postId: string) {
    try {
      const url = `https://graph.facebook.com/v23.0/${postId}/insights`;
      const params = {
        access_token: this._accessToken,
        metric: [
          "post_engaged_users",
          "post_clicks",
          "post_negative_feedback",
          "post_reach",
        ].join(","),
      };

      const response = await axios.get(url, { params });
      const insights = response.data?.data || [];

      const result: {
        engagedUsers?: number;
        postClicks?: number;
        negativeFeedback?: number;
        postReach?: number;
      } = {};

      insights.forEach((insight: any) => {
        const value = insight.values?.[0]?.value;
        switch (insight.name) {
          case "post_engaged_users":
            result.engagedUsers = value;
            break;
          case "post_clicks":
            result.postClicks = value;
            break;
          case "post_negative_feedback":
            result.negativeFeedback = value;
            break;
          case "post_reach":
            result.postReach = value;
            break;
        }
      });

      return result;
    } catch (error) {
      // Silently fail - insights might not be available for all posts
      console.warn(`Failed to fetch insights for post ${postId}:`, error);
      return {};
    }
  }

  /**
   * Fetch reaction breakdowns for a post
   * Note: Facebook API v23.0 only allows one reactions query per request
   * So we need separate calls for each reaction type or use a workaround
   */
  async getPostReactionBreakdown(postId: string) {
    try {
      // Fetch all reaction types separately
      const reactionTypes = ["LIKE", "LOVE", "WOW", "HAHA", "SORRY", "ANGER"];
      const reactions: {
        like?: number;
        love?: number;
        wow?: number;
        haha?: number;
        sorry?: number;
        anger?: number;
      } = {};

      for (const type of reactionTypes) {
        try {
          const url = `https://graph.facebook.com/v23.0/${postId}`;
          const response = await axios.get(url, {
            params: {
              access_token: this._accessToken,
              fields: `reactions.type(${type}).summary(total_count).limit(0)`,
            },
          });

          const count =
            response.data?.reactions?.summary?.total_count || 0;
          if (count > 0) {
            reactions[type.toLowerCase() as keyof typeof reactions] = count;
          }
        } catch {
          // Skip this reaction type if it fails
          continue;
        }
      }

      return reactions;
    } catch (error) {
      console.warn(`Failed to fetch reaction breakdown for post ${postId}:`, error);
      return {};
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
        const signedUrl = await s3.getSignedUrlForExternalApi(mediaUrl);

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
