import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const WallSchema = new mongoose.Schema(
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
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "ProjectSchema",
    },
    prompt: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    views: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: "wall",
  }
);

const WallModel =
  mongoose?.models?.WallSchema || mongoose.model("WallSchema", WallSchema);
export { WallSchema, WallModel };

export type WallDoc = WithId<InferSchemaType<typeof WallSchema>>;
export type Wall = Omit<
  ForClient<InferSchemaType<typeof WallSchema>>,
  "userId" | "projectId"
> & { userId: string; endsAt: string };
