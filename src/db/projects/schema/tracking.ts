import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const ProjectTrackingSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "ProjectSchema",
    },
    date: {
      type: Date,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    platform: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "project-trackings",
  }
);

const ProjectTrackingModel =
  mongoose.models.ProjectTrackingSchema ||
  mongoose.model("ProjectTrackingSchema", ProjectTrackingSchema);
export { ProjectTrackingSchema, ProjectTrackingModel };

export type ProjectTrackingDoc = WithId<
  InferSchemaType<typeof ProjectTrackingSchema>
>;
export type ProjectTracking = Omit<
  ForClient<InferSchemaType<typeof ProjectTrackingSchema>>,
  "projectId" | "date"
> & { projectId: string; date: string };
