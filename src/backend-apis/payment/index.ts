import tryCatchAsync from "@/lib/try-catch-async";
import { ApiError, ApiResponse } from "../types";
import api from "../axios";
import { apiRoutes } from "../routes";
import Stripe from "stripe";
import { Subscription } from "@prisma/client";

class PaymentService {
  async createSession(type: "subscription" | "coins" = "subscription") {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<{
        redirectUrl: string;
      }>
    >(async () => {
      const response = await api.post(apiRoutes.PAYMENT.SESSION(), { type });
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
      const response = await api.get(apiRoutes.PAYMENT.SESSION(), {
        params: {
          sessionId,
        },
      });
      return response;
    });

    if (err) throw new Error(err.response?.data?.message);

    return res?.data;
  }

  async getSubscription() {
    const [err, res] = await tryCatchAsync<ApiError, ApiResponse<Subscription>>(
      async () => {
        const response = await api.get(apiRoutes.PAYMENT.SUBSCRIPTIONS());
        return response;
      }
    );

    if (err) throw new Error(err.response?.data?.message);

    return res?.data.data;
  }

  async manageSubscription() {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<{
        url: string;
      }>
    >(async () => {
      const response = await api.put(apiRoutes.PAYMENT.SUBSCRIPTIONS());
      return response;
    });

    if (err) throw new Error(err.response?.data?.message);

    return res?.data;
  }
}

export const paymentService = new PaymentService();
