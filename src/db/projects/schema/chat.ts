import { WithId } from "@/lib/types";
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
      facebook: {
        type: String,
        required: true,
      },
      instagram: {
        type: String,
        required: true,
      },
      tiktok: {
        type: String,
        required: true,
      },
      x: {
        type: String,
        required: true,
      },
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

export type ProjectChat = WithId<InferSchemaType<typeof ProjectChatSchema>>;
export type ProjectChatDocument = mongoose.Document<ProjectChat>;
