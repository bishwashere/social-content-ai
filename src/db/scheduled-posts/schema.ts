import { WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const ScheduledPostsSchema = new mongoose.Schema(
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
    content: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    error: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: "scheduled-posts",
  }
);

const ScheduledPostsModel =
  mongoose.models?.ScheduledPostsSchema ||
  mongoose.model("ScheduledPostsSchema", ScheduledPostsSchema);
export { ScheduledPostsSchema, ScheduledPostsModel };

export type WallDoc = WithId<InferSchemaType<typeof ScheduledPostsSchema>>;
