import axios, { AxiosInstance } from "axios";
import { s3 } from "../s3";
import { detectMediaTypeFromUrl } from "../detect-media-type";
import { decryptToken } from "@/backend-apis/encryption";

type AnalyticsData = {
  likesCount: number;
  repliesCount: number;
  viewsCount: number;
};

class Threads {
  private _accessToken: string;
  private _client: AxiosInstance;

  constructor(args: { accessToken: string }) {
    this._accessToken = decryptToken(args.accessToken);
    this._client = axios.create({
      baseURL: "https://graph.threads.net/v1.0",
    });
  }

  async postToThreads(
    content: string,
    userId: string,
    mediaUrl?: string
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      console.log("🧵 Posting to Threads API");

      // Step 1: Create media container
      const createBody: Record<string, unknown> = {
        media_type: "TEXT",
        text: content,
        access_token: this._accessToken,
      };

      if (mediaUrl) {
        const signedUrl = await s3.getSignedUrlForVideoDownload(mediaUrl);
        const detected = detectMediaTypeFromUrl(signedUrl);
        if (detected === "img") {
          createBody.media_type = "IMAGE";
          createBody.image_url = signedUrl;
        } else if (detected === "video") {
          createBody.media_type = "VIDEO";
          createBody.video_url = signedUrl;
        } else {
          console.warn(
            `⚠️ detectMediaTypeFromUrl couldn't determine media type for "${mediaUrl}".`
          );
        }
      }

      const createResponse = await this._client.post(
        `${encodeURIComponent(userId)}/threads`,
        createBody
      );

      const containerData = createResponse.data;
      const containerId = containerData?.id;
      if (!containerId) {
        return {
          success: false,
          error: "Failed to get container ID from creation response",
        };
      }

      console.log("✅ Container created successfully:", containerId);

      if (createBody.media_type === "VIDEO") {
        return {
          success: true,
          data: {
            type: "VIDEO",
            container: containerData,
          },
        };
      }

      // Step 2: Publish the container-> except video
      const publishResponse = await this._client.post(
        `${encodeURIComponent(userId)}/threads_publish`,
        {
          creation_id: containerId,
          access_token: this._accessToken,
        }
      );

      const publishData = publishResponse.data;
      console.log("✅ Successfully published to Threads:", publishData);

      return { success: true };
    } catch (error) {
      console.error("❌ Error posting to Threads:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error posting to Threads",
      };
    }
  }

  /**
   * Check container status once and publish if ready.
   * Single attempt — returns:
   * - { success: true, publishData, containerStatus }
   * - { success: false, error, containerStatus?, raw? }
   * - null -> container not ready (e.g. PROCESSING) -> caller can retry later
   */
  public async checkAndPublishContainerOnce(
    containerId: string,
    userId: string
  ): Promise<
    | { success: true; publishData: any; containerStatus: string }
    | { success: false; error: string; containerStatus?: string; raw?: any }
    | null
  > {
    try {
      const statusResp = await this._client.get(
        `/${encodeURIComponent(containerId)}`,
        {
          params: {
            fields: "status,error_message",
            access_token: this._accessToken,
          },
        }
      );

      const statusJson = statusResp.data ?? {};
      const containerStatus: string | undefined = statusJson?.status;
      const errorMessage: string | undefined = statusJson?.error_message;

      if (!containerStatus) {
        return {
          success: false,
          error: "Container status missing from response",
          raw: statusJson,
        };
      }

      // Final failure states -> explicit error
      if (containerStatus === "ERROR" || containerStatus === "FAILED") {
        return {
          success: false,
          error: `Container processing failed: ${errorMessage ?? "ERROR"}`,
          containerStatus,
          raw: statusJson,
        };
      }

      if (containerStatus === "EXPIRED") {
        return {
          success: false,
          error: "Container expired before publishing.",
          containerStatus,
          raw: statusJson,
        };
      }

      // If not finished (e.g. PROCESSING), return null so caller can retry later
      if (containerStatus !== "FINISHED") {
        // not ready yet
        return null;
      }

      // containerStatus === FINISHED -> publish
      const publishResp = await this._client.post(
        `/${encodeURIComponent(userId)}/threads_publish`,
        {
          creation_id: containerId,
          access_token: this._accessToken,
        }
      );

      const publishData = publishResp.data ?? {};
      console.log("✅ Successfully published to Threads:", publishData);

      return { success: true, publishData, containerStatus };
    } catch (err: any) {
      const raw = err?.response?.data ?? err;
      console.error("❌ checkAndPublishContainerOnce error:", raw);
      const msg =
        raw?.error?.message || raw?.message || err?.message || "Unknown error";
      return { success: false, error: String(msg), raw };
    }
  }

  /**
   * Fetch all posts for a user (paginated) (id and content)
   */
  async fetchAllUserPosts(userId: string = "me") {
    const allPosts: Array<{ id: string; text: string; timestamp: string }> = [];
    let url:
      | string
      | null = `/${userId}/threads?fields=id,text,timestamp&limit=50&access_token=${this._accessToken}`;

    while (url) {
      const res: any = await this._client.get(url);
      const data = res.data.data;
      allPosts.push(...data);

      // Pagination
      url = res.data.paging?.cursors?.after
        ? `/${userId}/threads?fields=id,text&limit=50&after=${res.data.paging.cursors.after}&access_token=${this._accessToken}`
        : null;
    }

    return allPosts;
  }

  /**
   * Fetch insights for a single post
   */
  async fetchPostInsights(
    postId: string,
    metrics: string[] = ["likes", "replies"]
  ): Promise<AnalyticsData> {
    const metricParam = metrics.join(",");
    const url = `/${postId}/insights?metric=${metricParam}&access_token=${this._accessToken}`;
    const res = await this._client.get(url);

    return {
      likesCount:
        res.data.data.find((insight: any) => insight.name === "likes")
          ?.values?.[0]?.value || 0,
      repliesCount:
        res.data.data.find((insight: any) => insight.name === "replies")
          ?.values?.[0]?.value || 0,
      viewsCount:
        res.data.data.find((insight: any) => insight.name === "views")
          ?.values?.[0]?.value || 0,
    };
  }

  /**
   * Fetch all posts + insights for a user
   */
  async fetchUserPostsWithInsights(
    userId: string = "me",
    metrics: string[] = ["likes", "replies", "views"]
  ) {
    const posts = await this.fetchAllUserPosts(userId);
    // Sequential approach (safe for rate limits)
    const results: Array<{
      postId: string;
      content: string;
      date: string;
      insights: AnalyticsData;
    }> = [];
    for (const post of posts) {
      const insights = await this.fetchPostInsights(post.id, metrics);
      results.push({
        postId: post.id,
        content: post.text || "No text",
        insights,
        date: post.timestamp,
      });
    }

    return results;
  }
}

export { Threads };
