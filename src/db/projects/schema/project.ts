import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
    platformUrls: {
      // equivalent to Record<string, string>
      type: Map,
      of: String,
      required: false,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "projects",
  },
);

const ProjectModel =
  mongoose.models.ProjectSchema ||
  mongoose.model("ProjectSchema", ProjectSchema);
export { ProjectSchema, ProjectModel };

export type ProjectDoc = WithId<InferSchemaType<typeof ProjectSchema>>;
export type Project = Omit<
  ForClient<InferSchemaType<typeof ProjectSchema>>,
  "userId" | "platformUrls"
> & { userId: string; platformUrls: Record<string, string> };
