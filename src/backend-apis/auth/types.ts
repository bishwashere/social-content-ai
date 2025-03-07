import { MongooseBaseDocument } from "../types";

export type ContinueWithGoogleParams = {
  credential: string;
};

export type User = MongooseBaseDocument<{
  name: string;
  email: string;
  avatarUrl: string;
  idFromProvider: string;
}>;

export type ContinueWithGoogleResponse = {
  bearerToken: string;
  user: User;
};
