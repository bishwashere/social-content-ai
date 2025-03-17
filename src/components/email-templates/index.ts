import WelcomeEmail from "./welcome-on-login";

export const EMAIL_TEMPLATES = {
  WELCOME_ON_LOGIN: WelcomeEmail,
} as const;

export type EmailTemplate = keyof typeof EMAIL_TEMPLATES;
