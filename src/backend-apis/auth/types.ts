import { AuthValidatorType } from "@/validators/auth";
import { User, Subscription } from "@generated/prisma";

export type ContinueWithGoogleParams = AuthValidatorType["continueWithGoogle"];

export type ContinueWithGoogleResponse = {
  bearerToken: string;
  user: User;
};

export type GetUserSessionResponse = {
  user: User;
  subscription?: Subscription | null;
};
