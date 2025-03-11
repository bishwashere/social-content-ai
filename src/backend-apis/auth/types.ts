import { AuthValidatorType } from "@/validators/auth";
import { User } from "@/db/auth/schema/user";
import { Subscription } from "@/db/subscriptions/schema/subscription";

export type ContinueWithGoogleParams = AuthValidatorType["continueWithGoogle"];

export type ContinueWithGoogleResponse = {
  bearerToken: string;
  user: User;
};

export type GetUserSessionResponse = {
  user: User;
  subscription?: Subscription | null;
};
