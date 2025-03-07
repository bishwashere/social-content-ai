import { WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

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
  },
  {
    timestamps: true,
    collection: "users",
  }
);

const UserModel =
  mongoose.models.UserSchema || mongoose.model("UserSchema", UserSchema);
export { UserSchema, UserModel };

export type User = WithId<InferSchemaType<typeof UserSchema>>;
