export const AUTH_TOKEN_COOKIE_NAME = "social-ai-token";
export const IDEAS_ADMIN_TOKEN_COOKIE_NAME = "ideas-admin-token";
export const VIDEO_ADMIN_TOKEN_COOKIE_NAME = "video-admin-token";

export const INVITED_USER_ROLES = {
  VIEWER: "viewer",
  EDITOR: "editor",
  ADMIN: "admin",
};

export type InvitedUserRoles =
  (typeof INVITED_USER_ROLES)[keyof typeof INVITED_USER_ROLES];

export const SUBSCRIPTION_TYPES = {
  TRIAL: "trial",
  PAID: "paid",
};

export type SubscriptionTypes =
  (typeof SUBSCRIPTION_TYPES)[keyof typeof SUBSCRIPTION_TYPES];

export const CHAT_GENERATION_PER_MONTH = 100;

export const FREE_DASHBOARD_CHAT_SESSIONS = 2;

