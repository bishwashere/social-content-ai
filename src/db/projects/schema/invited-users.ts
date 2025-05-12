import { INVITED_USER_ROLES } from "@/constants/common";
import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const InvitedUserSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "ProjectSchema",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
    role: {
      type: String,
      required: true,
      enum: Object.values(INVITED_USER_ROLES),
    },
  },
  {
    timestamps: true,
    collection: "invited-users-to-projects",
  }
);

const InvitedUserModel =
  mongoose?.models?.InvitedUserSchema ||
  mongoose.model("InvitedUserSchema", InvitedUserSchema);
export { InvitedUserSchema, InvitedUserModel };

export type InvitedUserDoc = WithId<InferSchemaType<typeof InvitedUserSchema>>;
export type InvitedUser = Omit<
  ForClient<InferSchemaType<typeof InvitedUserSchema>>,
  "userId" | "projectId"
> & { userId: string; projectId: string };
