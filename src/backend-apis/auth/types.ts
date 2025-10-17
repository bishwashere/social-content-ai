import { AuthValidatorType } from "@/validators/auth";
import { User, Subscription } from "@prisma/client";

export type ContinueWithGoogleParams = AuthValidatorType["continueWithGoogle"];

export type ContinueWithGoogleResponse = {
  bearerToken: string;
  user: User;
};

export type GetUserSessionResponse = {
  user: User;
  subscription?: Subscription | null;
};

export type EmailLoginParams = AuthValidatorType["emailLogin"];

export type EmailLoginResponse = ContinueWithGoogleResponse;
