export const AUTH_TOKEN_COOKIE_NAME = "social-ai-token";

export const INVITED_USER_ROLES = {
  VIEWER: "viewer",
  EDITOR: "editor",
};

export type InvitedUserRoles =
  (typeof INVITED_USER_ROLES)[keyof typeof INVITED_USER_ROLES];

export const SUBSCRIPTION_TYPES = {
  TRIAL: "trial",
  PAID: "paid",
};

export type SubscriptionTypes =
  (typeof SUBSCRIPTION_TYPES)[keyof typeof SUBSCRIPTION_TYPES];

export const CHAT_GENERATION_PER_MONTH = 1000;
export const CHAT_GENERATION_PER_MONTH_WHILE_TRIAL = 10
