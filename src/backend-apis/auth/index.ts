import tryCatchAsync from "@/lib/try-catch-async";
import {
  ContinueWithGoogleParams,
  ContinueWithGoogleResponse,
  User,
} from "./types";
import { ApiError, ApiResponse } from "../types";
import api from "../axios";
import API_ROUTES from "../routes";
import Cookies from "js-cookie";
import { QueryClient } from "@tanstack/react-query";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";

class AuthService {
  /**
   * Login with google, creates account if it doesn't exist
   */
  async continueWithGoogle(
    { credential }: ContinueWithGoogleParams,
    queryClient: QueryClient
  ) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ContinueWithGoogleResponse>
    >(async () => {
      const response = await api.post(API_ROUTES.auth.CONTINUE_WITH_GOOGLE, {
        credential,
      });
      return response;
    });

    if (err) throw new Error(err.response?.data?.message);

    Cookies.set(AUTH_TOKEN_COOKIE_NAME, res?.data.data?.bearerToken || "");

    await queryClient.setQueryData(["session"], res?.data.data?.user);

    return res?.data;
  }

  /**
   * Retrieve the current session and user data
   */
  async getSession() {
    const [err, res] = await tryCatchAsync<ApiError, ApiResponse<User>>(
      async () => {
        const response = await api.get(API_ROUTES.auth.SESSION);
        return response;
      }
    );

    if (err) throw new Error(err.response?.data?.message);
    return res?.data.data;
  }

  /**
   * Logout the user by removing the token from the cookies and clearing the query cache
   */
  async logout(queryClient: QueryClient) {
    Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
    await queryClient.clear();
    window.location.href = "/";
    return "You have been logged out";
  }
}

export const authService = new AuthService();
