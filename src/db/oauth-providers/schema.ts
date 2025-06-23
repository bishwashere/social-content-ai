import { WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const OauthProvidersSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
    platform: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: false,
    },
    expiresAt: {
      type: Number,
      required: false,
    },
    facebookPageId: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "oauth-providers",
  }
);

const OauthProvidersModel =
  mongoose.models?.OauthProvidersSchema ||
  mongoose.model("OauthProvidersSchema", OauthProvidersSchema);
export { OauthProvidersSchema, OauthProvidersModel };

export type WallDoc = WithId<InferSchemaType<typeof OauthProvidersSchema>>;
