import axios, { AxiosInstance } from "axios";

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
      "/posts?fields=id,message,reactions.type(LIKE).summary(total_count).limit(0),comments.summary(total_count).limit(0),insights.metric(post_impressions,post_impressions_unique)&access_token=" +
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
}

export { Fb };
