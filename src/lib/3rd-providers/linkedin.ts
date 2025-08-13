import axios, { AxiosInstance } from "axios";

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
      baseURL: "https://api.linkedin.com/v2",
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
}

export { Linkedin };
