import InactivityEmail from "./inactive-projects";
import WelcomeEmail from "./welcome-on-login";

export const EMAIL_TEMPLATES = {
  WELCOME_ON_LOGIN: WelcomeEmail,
  INACTIVE_PROJECTS: InactivityEmail,
} as const;

export type EmailTemplate = keyof typeof EMAIL_TEMPLATES;
