import axios, { AxiosInstance } from "axios";
import { s3 } from "../s3";
import { detectMediaTypeFromUrl } from "../detect-media-type";
import { decryptToken } from "@/backend-apis/encryption";

type AnalyticsData = {
  impressions: number;
  reach: number;
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  sharesCount: number;
};

type ConstructorProps = {
  accessToken: string;
  /**
   * If true, uses graph.instagram.com (for Instagram Login flow)
   * If false, uses graph.facebook.com (for Facebook Login flow with linked Instagram Business account)
   */
  isStandalone?: boolean;
};

/**
 * Returns true when a Meta/Instagram API error message indicates an expired or
 * invalid access token that requires the user to reconnect their account.
 */
function isExpiredTokenError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("session has expired") ||
    lower.includes("error validating access token") ||
    lower.includes("invalid oauth access token") ||
    lower.includes("access token has expired") ||
    lower.includes("oauthexception")
  );
}

/**
 * Instagram Business API Client
 * Supports two authentication flows:
 * 1. Instagram Login (standalone): Uses graph.instagram.com with instagram_business_* permissions
 * 2. Facebook Login: Uses graph.facebook.com with Facebook Page tokens
 * Note: Instagram requires media for all posts - text-only posts are not supported
 */
class Instagram {
  private _accessToken: string;
  private _client: AxiosInstance;
  private _baseUrl: string;

  constructor(args: ConstructorProps) {
    this._accessToken = decryptToken(args.accessToken);
    
    // Auto-detect token type as a safeguard
    // IGA... tokens = Instagram Login (standalone)
    // EAA... tokens = Facebook Login (linked)
    const isTokenStandalone = this._accessToken.startsWith("IGA");
    const isTokenFacebook = this._accessToken.startsWith("EAA");
    
    // Warn if there's a mismatch between isStandalone flag and token type
    if (args.isStandalone !== undefined) {
      if (isTokenStandalone && !args.isStandalone) {
        console.warn(`⚠️ Instagram token type mismatch: Token is IGA (standalone) but isStandalone=false. Auto-correcting to use graph.instagram.com`);
      } else if (isTokenFacebook && args.isStandalone) {
        console.warn(`⚠️ Instagram token type mismatch: Token is EAA (Facebook) but isStandalone=true. Auto-correcting to use graph.facebook.com`);
      }
    }
    
    // Use token type to determine the correct endpoint (auto-correct mismatches)
    const shouldUseInstagramEndpoint = isTokenStandalone;
    
    this._baseUrl = shouldUseInstagramEndpoint 
      ? "https://graph.instagram.com/v23.0"
      : "https://graph.facebook.com/v23.0";
    this._client = axios.create({
      baseURL: this._baseUrl,
    });
    console.log(`📸 Instagram client initialized with base URL: ${this._baseUrl} (token type: ${isTokenStandalone ? 'IGA' : isTokenFacebook ? 'EAA' : 'unknown'})`);
  }

  /**
   * Post to Instagram
   * Instagram requires media (image or video) for all posts
   * @param content - Caption for the post
   * @param igUserId - Instagram Business Account ID
   * @param mediaUrl - Required URL to image or video
   */
  async postToInstagram(
    content: string,
    igUserId: string,
    mediaUrl: string
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log("📸 Posting to Instagram API");
      console.log("📸 Using API base URL:", this._baseUrl);
      console.log("📸 igUserId (pageId):", igUserId);
      console.log("📸 mediaUrl (S3 key):", mediaUrl);

      // Validate igUserId
      if (!igUserId || igUserId.trim() === "") {
        console.error("❌ Instagram Business Account ID (pageId) is missing");
        return {
          success: false,
          error: "Instagram Business Account ID (pageId) is required. Please reconnect your Instagram account.",
        };
      }

      if (!mediaUrl) {
        return {
          success: false,
          error: "Instagram requires media (image or video) for all posts",
        };
      }

      // Get signed URL for media (use external API method without Content-Disposition header)
      let signedUrl: string;
      try {
        signedUrl = await s3.getSignedUrlForExternalApi(mediaUrl);
        console.log("📸 Generated signed URL for Instagram");
      } catch (s3Error) {
        console.error("❌ Failed to generate signed URL:", s3Error);
        return {
          success: false,
          error: `Failed to generate media URL: ${s3Error instanceof Error ? s3Error.message : 'Unknown S3 error'}`,
        };
      }

      // Detect media type from the original S3 key (not the signed URL with query params)
      const mediaType = detectMediaTypeFromUrl(mediaUrl);

      if (!mediaType || (mediaType !== "img" && mediaType !== "video")) {
        return {
          success: false,
          error: "Invalid media type. Instagram only supports images and videos.",
        };
      }

      // Step 1: Create media container
      let createBody: Record<string, string>;
      
      if (mediaType === "img") {
        createBody = {
          image_url: signedUrl,
          caption: content,
          access_token: this._accessToken,
        };
      } else {
        // Video - includes Reels
        createBody = {
          media_type: "REELS", // Use REELS for video content
          video_url: signedUrl,
          caption: content,
          access_token: this._accessToken,
        };
      }

      console.log("📸 Creating Instagram media container...");
      console.log("📸 Media type detected:", mediaType);
      console.log("📸 Full API URL:", `${this._baseUrl}/${igUserId}/media`);
      console.log("📸 Request body (without access_token):", {
        ...createBody,
        access_token: "[REDACTED]",
      });
      
      const createResponse = await this._client.post(
        `/${igUserId}/media`,
        null,
        { params: createBody }
      );

      const containerData = createResponse.data;
      const containerId = containerData?.id;

      if (!containerId) {
        console.error("❌ Failed to create Instagram container:", JSON.stringify(containerData, null, 2));
        const errorMessage = containerData?.error?.message 
          || containerData?.error?.error_user_msg 
          || containerData?.error?.error_subcode
          || "Failed to create media container - Instagram could not process the image";
        return {
          success: false,
          error: errorMessage,
        };
      }

      console.log("✅ Instagram container created:", containerId);

      // For videos, we need to wait longer for processing
      if (mediaType === "video") {
        console.log("🎬 Video detected, waiting for processing...");
        const publishResult = await this.waitAndPublishContainer(
          containerId,
          igUserId,
          30, // max attempts
          5000 // 5 seconds between attempts
        );
        return publishResult;
      }

      // For images, Instagram may still need time to fetch and process from external URL
      // Wait for container to be ready before publishing (shorter timeout for images)
      console.log("🖼️ Image detected, waiting for container to be ready...");
      const publishResult = await this.waitAndPublishContainer(
        containerId,
        igUserId,
        10, // max 10 attempts for images (50 seconds max)
        5000 // 5 seconds between attempts
      );
      return publishResult;
    } catch (error: any) {
      console.error("❌ Error posting to Instagram:", error?.response?.data || error);
      const rawMessage: string = error?.response?.data?.error?.message 
        || error?.message 
        || "Unknown error posting to Instagram";
      return {
        success: false,
        error: isExpiredTokenError(rawMessage)
          ? "Your Instagram session has expired. Please reconnect your Instagram account in Settings → Connected Accounts."
          : rawMessage,
      };
    }
  }

  /**
   * Wait for video container to finish processing, then publish
   */
  private async waitAndPublishContainer(
    containerId: string,
    igUserId: string,
    maxAttempts: number = 30,
    delayMs: number = 5000
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📸 Checking container status (attempt ${attempt}/${maxAttempts})...`);
        
        const statusResponse = await this._client.get(`/${containerId}`, {
          params: {
            fields: "status_code,status",
            access_token: this._accessToken,
          },
        });

        const status = statusResponse.data?.status_code;
        console.log(`📸 Container status: ${status}`);

        if (status === "FINISHED") {
          // Container is ready, publish it
          const publishResponse = await this._client.post(
            `/${igUserId}/media_publish`,
            null,
            {
              params: {
                creation_id: containerId,
                access_token: this._accessToken,
              },
            }
          );

          const publishData = publishResponse.data;

          // Meta Graph API returns HTTP 200 even for errors — check body explicitly
          if (publishData?.error) {
            const apiError = publishData.error;
            console.error(`❌ Instagram media_publish API error (attempt ${attempt}/${maxAttempts}):`, apiError);

            // Code 9007 / subcode 2207027 = "Media ID is not available" — transient, retry
            const isTransient =
              apiError.code === 9007 ||
              (typeof apiError.message === "string" &&
                apiError.message.toLowerCase().includes("media id is not available"));

            if (isTransient && attempt < maxAttempts) {
              console.log(`⏳ Transient media_publish error (code ${apiError.code}), retrying after ${delayMs}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }

            return {
              success: false,
              error: apiError.message || `Media publish failed with code ${apiError.code}`,
            };
          }

          if (!publishData?.id) {
            console.error(`❌ Instagram media_publish returned no ID (attempt ${attempt}/${maxAttempts}):`, publishData);
            if (attempt < maxAttempts) {
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }
            return { success: false, error: "Media published but no media ID returned" };
          }

          console.log("✅ Successfully published to Instagram:", publishData);
          return { success: true, data: publishData };
        }

        if (status === "ERROR" || status === "EXPIRED") {
          return {
            success: false,
            error: `Container processing failed with status: ${status}`,
          };
        }

        // Still processing, wait and retry
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        console.error(`❌ Error checking container status (attempt ${attempt}):`, error?.response?.data || error);
        if (attempt === maxAttempts) {
          return {
            success: false,
            error: `Failed to check container status after ${maxAttempts} attempts`,
          };
        }
      }
    }

    return {
      success: false,
      error: `Container processing timed out after ${maxAttempts} attempts`,
    };
  }

  /**
   * Check container status once and publish if ready (for async processing)
   * Similar to Threads - returns null if still processing
   */
  async checkAndPublishContainerOnce(
    containerId: string,
    igUserId: string
  ): Promise<
    | { success: true; publishData: any; containerStatus: string }
    | { success: false; error: string; containerStatus?: string; raw?: any }
    | null
  > {
    try {
      const statusResp = await this._client.get(`/${containerId}`, {
        params: {
          fields: "status_code,status",
          access_token: this._accessToken,
        },
      });

      const statusJson = statusResp.data ?? {};
      const containerStatus: string | undefined = statusJson?.status_code;

      if (!containerStatus) {
        return {
          success: false,
          error: "Container status missing from response",
          raw: statusJson,
        };
      }

      // Error states
      if (containerStatus === "ERROR") {
        return {
          success: false,
          error: "Container processing failed",
          containerStatus,
          raw: statusJson,
        };
      }

      if (containerStatus === "EXPIRED") {
        return {
          success: false,
          error: "Container expired before publishing",
          containerStatus,
          raw: statusJson,
        };
      }

      // Not ready yet
      if (containerStatus !== "FINISHED") {
        return null;
      }

      // Ready to publish
      const publishResp = await this._client.post(
        `/${igUserId}/media_publish`,
        null,
        {
          params: {
            creation_id: containerId,
            access_token: this._accessToken,
          },
        }
      );

      const publishData = publishResp.data ?? {};

      // Meta Graph API returns HTTP 200 even for errors — check body explicitly
      if (publishData?.error) {
        const apiError = publishData.error;
        console.error("❌ Instagram media_publish API error:", apiError);
        return {
          success: false,
          error: apiError.message || `Media publish failed with code ${apiError.code}`,
          containerStatus,
          raw: publishData,
        };
      }

      if (!publishData?.id) {
        console.error("❌ Instagram media_publish returned no ID:", publishData);
        return {
          success: false,
          error: "Media published but no media ID returned",
          containerStatus,
          raw: publishData,
        };
      }

      console.log("✅ Successfully published to Instagram:", publishData);

      return { success: true, publishData, containerStatus };
    } catch (err: any) {
      const raw = err?.response?.data ?? err;
      console.error("❌ checkAndPublishContainerOnce error:", raw);
      const msg = raw?.error?.message || raw?.message || err?.message || "Unknown error";
      return { success: false, error: String(msg), raw };
    }
  }

  /**
   * Get the Instagram Business Account ID linked to a Facebook Page
   */
  async getInstagramBusinessAccountId(
    facebookPageId: string,
    pageAccessToken: string
  ): Promise<string | null> {
    try {
      const response = await this._client.get(`/${facebookPageId}`, {
        params: {
          fields: "instagram_business_account",
          access_token: pageAccessToken,
        },
      });

      return response.data?.instagram_business_account?.id || null;
    } catch (error) {
      console.error("❌ Error getting Instagram Business Account ID:", error);
      return null;
    }
  }

  /**
   * Fetch user's Instagram media (posts)
   */
  async fetchUserMedia(
    igUserId: string,
    limit: number = 25
  ): Promise<Array<{ id: string; caption?: string; timestamp: string; media_type: string; permalink: string }>> {
    try {
      const response = await this._client.get(`/${igUserId}/media`, {
        params: {
          fields: "id,caption,timestamp,media_type,permalink",
          limit,
          access_token: this._accessToken,
        },
      });

      return response.data?.data || [];
    } catch (error) {
      console.error("❌ Error fetching Instagram media:", error);
      return [];
    }
  }

  /**
   * Fetch insights for a single media post
   */
  async fetchMediaInsights(
    mediaId: string
  ): Promise<AnalyticsData> {
    try {
      const response = await this._client.get(`/${mediaId}/insights`, {
        params: {
          metric: "impressions,reach,saved,shares",
          access_token: this._accessToken,
        },
      });

      const insightsData = response.data?.data || [];
      
      // Also get likes and comments from the media object
      const mediaResponse = await this._client.get(`/${mediaId}`, {
        params: {
          fields: "like_count,comments_count",
          access_token: this._accessToken,
        },
      });

      return {
        impressions: insightsData.find((i: any) => i.name === "impressions")?.values?.[0]?.value || 0,
        reach: insightsData.find((i: any) => i.name === "reach")?.values?.[0]?.value || 0,
        likesCount: mediaResponse.data?.like_count || 0,
        commentsCount: mediaResponse.data?.comments_count || 0,
        savesCount: insightsData.find((i: any) => i.name === "saved")?.values?.[0]?.value || 0,
        sharesCount: insightsData.find((i: any) => i.name === "shares")?.values?.[0]?.value || 0,
      };
    } catch (error) {
      console.error("❌ Error fetching Instagram media insights:", error);
      return {
        impressions: 0,
        reach: 0,
        likesCount: 0,
        commentsCount: 0,
        savesCount: 0,
        sharesCount: 0,
      };
    }
  }

  /**
   * Fetch user profile information
   */
  async fetchUserProfile(igUserId: string): Promise<{
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
    followersCount?: number;
    followsCount?: number;
    mediaCount?: number;
  } | null> {
    try {
      const response = await this._client.get(`/${igUserId}`, {
        params: {
          fields: "id,username,name,profile_picture_url,followers_count,follows_count,media_count",
          access_token: this._accessToken,
        },
      });

      const data = response.data;
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        profilePictureUrl: data.profile_picture_url,
        followersCount: data.followers_count,
        followsCount: data.follows_count,
        mediaCount: data.media_count,
      };
    } catch (error) {
      console.error("❌ Error fetching Instagram profile:", error);
      return null;
    }
  }
}

export { Instagram };
