import axios, { AxiosError, AxiosInstance } from "axios";

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
      console.log(res.data);
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

  async postToPage(pageId: string, content: string) {
    try {
      const { data } = await this._client.post("/rest/posts", {
        author: `urn:li:organization:${pageId}`,
        commentary: content,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        // content: {
        //   media: {
        //     title: "title of the video",
        //     id: "urn:li:video:C5F10AQGKQg_6y2a4sQ"
        //   }
        // },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      });

      return data;
    }
    catch (err) {
      throw err;
    }
  }

}

export { Linkedin };
