import InactivityEmail from "./inactive-projects";
import WelcomeEmail from "./welcome-on-login";
import FirstProjectEmail from "./first-project-created";
import SignupNoProjectEmail from "./signup-no-project";
import MilestoneReachedEmail from "./milestone-reached";

export const EMAIL_TEMPLATES = {
  WELCOME_ON_LOGIN: WelcomeEmail,
  INACTIVE_PROJECTS: InactivityEmail,
  FIRST_PROJECT_CREATED: FirstProjectEmail,
  SIGNUP_NO_PROJECT: SignupNoProjectEmail,
  MILESTONE_REACHED: MilestoneReachedEmail,
} as const;

export type EmailTemplate = keyof typeof EMAIL_TEMPLATES;
