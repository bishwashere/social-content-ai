import tryCatchAsync from "@/lib/try-catch-async";
import {
  ContinueWithGoogleParams,
  ContinueWithGoogleResponse,
  GetUserSessionResponse,
} from "./types";
import { ApiError, ApiResponse } from "../types";
import api from "../axios";
import Cookies from "js-cookie";
import { QueryClient } from "@tanstack/react-query";
import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { apiRoutes } from "../routes";

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
      const response = await api.post(apiRoutes.AUTH.CONTINUE_WITH_GOOGLE(), {
        credential,
      });
      return response;
    });

    if (err) throw new Error(err.response?.data?.message);

    Cookies.set(AUTH_TOKEN_COOKIE_NAME, res?.data.data?.bearerToken || "", {
      expires: 30, // Cookie will expire in 30 days
      secure: process.env.NODE_ENV === "production", // Only use secure in production
      sameSite: "lax", // Protect against CSRF
    });

    await queryClient.setQueryData(["session"], res?.data.data);

    return res?.data;
  }

  /**
   * Retrieve the current session and user data
   */
  async getSession() {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<GetUserSessionResponse>
    >(async () => {
      const response = await api.get(apiRoutes.AUTH.SESSION());
      return response;
    });

    if (err) throw new Error(err.response?.data?.message);
    return res?.data.data;
  }

  /**
   * Logout the user by removing the token from the cookies and clearing the query cache
   */
  async logout(queryClient: QueryClient, router: AppRouterInstance) {
    Cookies.remove(AUTH_TOKEN_COOKIE_NAME);
    await queryClient.clear();
    router.replace("/");
    return "You have been logged out";
  }
}

export const authService = new AuthService();
