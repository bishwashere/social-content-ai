import axios, { AxiosInstance } from "axios";
import { get } from 'https';
import { s3 } from "../s3";

class Linkedin {
  private _accessToken: string;
  private _client: AxiosInstance;
  private _expiresAt: number;
  private _clientId = process.env.AUTH_LINKEDIN_ID;
  private _clientSecret = process.env.AUTH_LINKEDIN_SECRET;

  constructor(args: { accessToken: string; expiresAt: number }) {
    this._accessToken = args.accessToken;
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
    const signedUrl = await s3.getSignedUrlForVideoDownload(mediaUrl);
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
        // console.log(stats);

        insights.push({
          postId,
          content: commentary,
          likes: stats.likeCount || 0,
          comments: stats.commentCount || 0,
          impressions: stats.impressionCount || 0,
          uniqueImpressions: stats.uniqueImpressionsCount || 0,
          shares: stats.shareCount || 0,
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
