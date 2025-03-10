import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const ProjectChatSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "ProjectSchema",
    },
    title: {
      type: String,
      required: true,
    },
    prompt: {
      type: String,
      default: "",
    },
    contents: {
      // equivalent to Record<string, string>
      type: Map,
      of: String,
      required: false,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "project-chats",
  }
);

const ProjectChatModel =
  mongoose.models.ProjectChatSchema ||
  mongoose.model("ProjectChatSchema", ProjectChatSchema);
export { ProjectChatSchema, ProjectChatModel };

export type ProjectChatDoc = WithId<InferSchemaType<typeof ProjectChatSchema>>;
export type ProjectChat = Omit<
  ForClient<InferSchemaType<typeof ProjectChatSchema>>,
  "projectId"
> & { projectId: string };
