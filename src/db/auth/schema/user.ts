import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

/**
 * Mongoose schema for the user collection
 */
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    idFromProvider: {
      type: String,
      required: true,
    },
    remainingChatGenerations: {
      type: Number,
      required: true,
      default: 0,
    },
    hasClaimedFreeTrial: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

const UserModel =
  mongoose.models.UserSchema || mongoose.model("UserSchema", UserSchema);
export { UserSchema, UserModel };

export type UserDoc = WithId<InferSchemaType<typeof UserSchema>>;
export type User = ForClient<InferSchemaType<typeof UserSchema>>;
