import { AuthValidatorType } from "@/validators/auth";
import { User } from "@/db/auth/schema/user";

export type ContinueWithGoogleParams = AuthValidatorType["continueWithGoogle"];

export type ContinueWithGoogleResponse = {
  bearerToken: string;
  user: User;
};

export type GetUserSessionResponse = User;
