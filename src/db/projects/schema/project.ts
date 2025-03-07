import { WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
  },
  {
    timestamps: true,
    collection: "projects",
  }
);

const ProjectModel =
  mongoose.models.ProjectSchema ||
  mongoose.model("ProjectSchema", ProjectSchema);
export { ProjectSchema, ProjectModel };

export type Project = WithId<InferSchemaType<typeof ProjectSchema>>;
export type ProjectDocument = mongoose.Document<Project>;
