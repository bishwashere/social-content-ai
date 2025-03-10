import tryCatchAsync from "@/lib/try-catch-async";
import { ApiError, ApiResponse } from "../types";
import api from "../axios";
import { apiRoutes } from "../routes";
import Stripe from "stripe";

class CheckoutService {
  async createSession() {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<{
        redirectUrl: string;
      }>
    >(async () => {
      const response = await api.post(apiRoutes.CHECKOUT.SESSION());
      return response;
    });

    if (err) throw new Error(err.response?.data?.message);

    return res?.data;
  }

  async getSessionDetails(sessionId: string) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<Stripe.Response<Stripe.Checkout.Session>>
    >(async () => {
      const response = await api.get(apiRoutes.CHECKOUT.SESSION(), {
        params: {
          sessionId,
        },
      });
      return response;
    });

    if (err) throw new Error(err.response?.data?.message);

    return res?.data;
  }
}

export const checkoutService = new CheckoutService();
