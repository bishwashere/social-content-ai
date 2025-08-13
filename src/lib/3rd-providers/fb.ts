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
    this._baseUrl = "https://graph.facebook.com/v22.0";

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
      accessToken: this._accessToken,
      picture: page.picture?.data?.url,
    })) as FbPage[];
  }
}

export { Fb };
