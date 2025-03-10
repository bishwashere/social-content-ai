import axios, { AxiosInstance } from "axios";

/**
 * Handles Google Oauth requests like fetching user profile, etc
 * @param {string} credential - Google Oauth credential received from the client
 */
export class GoogleOauth {
  private credential: string;
  baseUri = "https://www.googleapis.com/oauth2/v2";
  axios: AxiosInstance;

  constructor(credential: string) {
    this.credential = credential;
    this.axios = axios.create({
      baseURL: this.baseUri,
      headers: {
        Authorization: `Bearer ${this.credential}`,
      },
    });
  }

  /**
   * Fetches the user profile from Google Oauth
   * @returns Google Oauth user profile
   */
  async getUserProfile(): Promise<GoogleOauthUserProfile> {
    const resp = await this.axios.get("/userinfo");

    return resp.data;
  }
}

/**
 * The Google Oauth user profile returned from Google Oauth API
 */
export type GoogleOauthUserProfile = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  hd: string;
};
