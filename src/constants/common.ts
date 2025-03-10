export const AUTH_TOKEN_COOKIE_NAME = "social-ai-token";

export const INVITED_USER_ROLES = {
  VIEWER: "viewer",
  EDITOR: "editor",
};

export type InvitedUserRoles =
  (typeof INVITED_USER_ROLES)[keyof typeof INVITED_USER_ROLES];
