import axios, { AxiosInstance } from "axios";
import { get } from 'https';
import { s3 } from "../s3";
import { decryptToken, encryptTokenFields } from "@/backend-apis/encryption";
import { prisma } from "@/lib/prisma";

class Linkedin {
  private _accessToken: string;
  private _client: AxiosInstance;
  private _expiresAt: number;
  private _clientId = process.env.AUTH_LINKEDIN_ID;
  private _clientSecret = process.env.AUTH_LINKEDIN_SECRET;

  constructor(args: { accessToken: string; expiresAt: number }) {
    this._accessToken = decryptToken(args.accessToken);
    this._expiresAt = args.expiresAt;

    this._client = axios.create({
      baseURL: "https://api.linkedin.com",
      headers: {
        Authorization: `Bearer ${this._accessToken}`,
        "LinkedIn-Version": 202507,
        "Content-Type": "application/json",
      }
    });
  }

  async getMyProfile() {
    try {
      const res = await this._client.get("/me", {
        headers: {
          Authorization: `Bearer ${this._accessToken}`,
        },
      });
      // console.log(res.data);
      return res.data;
    } catch {
      return null;
    }
  }

  async getMyPages() {
    const res = await this._client.get("/rest/organizationAcls?q=roleAssignee");

    const pages: {
      roleAssignee: string,
      state: string,
      lastModified: object,
      role: string,
      created: string,
      organization: string
    }[] = res.data.elements;

    if (!pages) return null;

    const pagesData: { id: string, name: string, logo: string }[] = [];
    for (const page of pages) {
      const pageId = page.organization.split(":").pop();
      const pageDataRes = await this._client.get(`/rest/organizations/${pageId}`);
      const data = {
        id: String(pageDataRes.data.id),
        name: pageDataRes.data.localizedName,
        logo: pageDataRes.data.logoV2 ? pageDataRes.data.logoV2.original ?? "" : ""
      }
      pagesData.push(data);
    }

    return pagesData;
  }

  async getImage(imageUrn: string) {
    const res = await this._client.get(`/rest/images/${imageUrn}`)
    return res.data.downloadUrl as string;
  }

  async uploadToLinkedin(ownerUrn: string, mediaUrl: string) {

    // Register/Initialize Upload
    const res = await this._client.post('/rest/images?action=initializeUpload', { initializeUploadRequest: { owner: `urn:li:organization:${ownerUrn}` } });

    const registerUploadData = {
      uploadUrl: res.data.value.uploadUrl,
      asset: res.data.value.image, // URN like "urn:li:image:..."
    };

    // Download image from URL into buffer
    const signedUrl = await s3.getSignedUrlForExternalApi(mediaUrl);
    const imageBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: any[] = [];
      get(signedUrl, (resp) => {
        resp.on('data', chunk => chunks.push(chunk));
        resp.on('end', () => resolve(Buffer.concat(chunks)));
        resp.on('error', reject);
      });
    });

    // Upload binary to LinkedIn
    const data = await axios.put(registerUploadData.uploadUrl, imageBuffer, {
      headers: {
        "Authorization": `Bearer ${this._accessToken}`,
        "Content-Type": "application/octet-stream"
      },
      maxBodyLength: Infinity,
    });
    if(data.status === 201 || data.status === 200) {
      console.log("Post Image uploaded to Linkedin");
    }

    return registerUploadData.asset;
  }

  async postToPage(pageId: string, content: string, media: string | null) {
    try {
      let mediaUrn: string | undefined;

      if (media) {
        mediaUrn = await this.uploadToLinkedin(pageId, media);
      }

      const payload: any = {
        author: `urn:li:organization:${pageId}`,
        commentary: content,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      };

      // Only attach media if present
      if (mediaUrn) {
        payload.content = {
          media: {
            id: mediaUrn
          }
        };
      }

      const { data } = await this._client.post("/rest/posts", payload);
      return data;
    } catch (err) {
      throw err;
    }
  }


  async getMyPostInsights(pageId: string) {
    try {
      // Fetch all posts from the organization
      console.log("Fetching Posts form Linkedin API");
      const postsRes = await this._client.get("/rest/posts", {
        params: { author: `urn:li:organization:${pageId}`, q: "author", count: 100 },
      });

      const posts = postsRes.data.elements as Array<{
        id: string;
        commentary?: string;
        createdAt: number;
      }>;

      const insights: {
        postId: string;
        content: string;
        likes: number;
        comments: number;
        impressions: number;
        uniqueImpressions: number;
        shares: number;
        date: Date;
      }[] = [];

      for (const post of posts) {
        const postId = post.id;
        const commentary = post.commentary || "";
        const date = new Date(post.createdAt);

        // // Likes & comments
        // const reactionsRes = await this._client.get(`/rest/socialActions/${encodeURIComponent(postId)}`);
        // const reactionsData = reactionsRes.data;

        const statsRes = await this._client.get(`/v2/organizationalEntityShareStatistics`,
          {
            params: {
              q: "organizationalEntity",
              organizationalEntity: `urn:li:organization:${pageId}`,
              shares: postId,
            },
          }
        );

        const stats = statsRes.data.elements?.[0]?.totalShareStatistics;
        
        // Log impression data for debugging
        if (stats) {
          console.log(`[LinkedIn] Post ${postId.substring(0, 30)}... stats:`, {
            impressionCount: stats.impressionCount,
            uniqueImpressionsCount: stats.uniqueImpressionsCount,
            likeCount: stats.likeCount,
            commentCount: stats.commentCount,
          });
        } else {
          console.warn(`[LinkedIn] No stats returned for post ${postId}`);
        }

        insights.push({
          postId,
          content: commentary,
          likes: stats?.likeCount || 0,
          comments: stats?.commentCount || 0,
          impressions: stats?.impressionCount || 0,
          uniqueImpressions: stats?.uniqueImpressionsCount || 0,
          shares: stats?.shareCount || 0,
          // clicks: stats.clickCount || 0,
          // engagement: stats.engagement || 0,
          date,
        });
      }

      return insights;
    } catch (err) {
      throw err;
    }
  }


  async getFollowersCount(pageId: string) {

    const res = await this._client(`/rest/networkSizes/urn:li:organization:${pageId}?edgeType=COMPANY_FOLLOWED_BY_MEMBER`)
    const data = await res.data;
    // console.log(data)
    const totalFollowers = data.firstDegreeSize ?? 0;

    return Number(totalFollowers);
  }


}

export { Linkedin };

/**
 * Check if the LinkedIn access token for a given user+page is expired,
 * and refresh it if so. LinkedIn expiresAt is stored as a millisecond timestamp.
 * Returns the (possibly refreshed) encrypted access token.
 */
export const checkAndRefreshLinkedinToken = async (
  userId: string,
  pageId: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> => {
  console.log(`🔍 Checking LinkedIn token for user: ${userId}, page: ${pageId}`);

  try {
    const oauthData = await prisma.oauthProvider.findFirst({
      where: { userId, platform: "linkedin", pageId },
    });

    if (!oauthData) {
      return { success: false, error: "No LinkedIn authentication found" };
    }

    const isExpired = (oauthData.expiresAt || 0) <= Date.now();

    if (!isExpired) {
      console.log("✅ LinkedIn token is still valid");
      return { success: true, accessToken: oauthData.accessToken };
    }

    console.log("⚠️ LinkedIn token expired, attempting to refresh");

    if (!oauthData.refreshToken) {
      return {
        success: false,
        error: "LinkedIn token expired and no refresh token available. User must reconnect LinkedIn.",
      };
    }

    const decryptedRefreshToken = decryptToken(oauthData.refreshToken);
    const clientId = process.env.AUTH_LINKEDIN_ID;
    const clientSecret = process.env.AUTH_LINKEDIN_SECRET;

    if (!clientId || !clientSecret) {
      return { success: false, error: "LinkedIn API credentials not configured" };
    }

    const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: decryptedRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error("❌ LinkedIn token refresh failed:", errBody);
      return {
        success: false,
        error: `LinkedIn token refresh failed (${response.status}): ${JSON.stringify(errBody)}`,
      };
    }

    const token = await response.json();
    const newExpiresAt = Date.now() + token.expires_in * 1000;

    const encrypted = encryptTokenFields(
      {
        accessToken: token.access_token,
        refreshToken: token.refresh_token || decryptedRefreshToken,
      },
      ["accessToken", "refreshToken"]
    );

    await prisma.oauthProvider.update({
      where: { id: oauthData.id },
      data: {
        accessToken: encrypted.accessToken,
        refreshToken: encrypted.refreshToken,
        expiresAt: newExpiresAt,
      },
    });

    console.log("✅ LinkedIn token refreshed and saved");
    return { success: true, accessToken: encrypted.accessToken };
  } catch (error) {
    console.error("❌ Error refreshing LinkedIn token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
