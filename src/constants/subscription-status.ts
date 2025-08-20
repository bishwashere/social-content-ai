export const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  TRIALING: "trial",
  TRIAL: "trial",
  CANCELLED: "cancelled",
  UNPAID: "unpaid",
} as const;
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];
