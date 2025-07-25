import mongoose, { InferSchemaType } from "mongoose";
import { ForClient, WithId } from "@/lib/types";

const CampaignChatSchema = new mongoose.Schema(
  {
    title: { type: String, required: false },
    prompt: { type: String, default: "" },
    day: { type: Number, required: true },
    campaignTitle: { type: String, required: true },
    contents: {
      type: Map,
      of: String,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "generated"],
      default: "pending",
    },
  },
  { timestamps: true } // This adds createdAt and updatedAt to each chat
);

const CampaignPlannerSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectSchema",
      required: true,
    },
    goal: { type: String, required: true },
    chats: [CampaignChatSchema],
    campaignId: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "campaign-planners",
  }
);

const CampaignPlannerModel =
  mongoose.models.CampaignPlannerSchema ||
  mongoose.model("CampaignPlannerSchema", CampaignPlannerSchema);

export { CampaignPlannerSchema, CampaignPlannerModel };

// Types
export type CampaignPlannerDoc = WithId<
  InferSchemaType<typeof CampaignPlannerSchema>
>;
export type CampaignPlanner = ForClient<
  InferSchemaType<typeof CampaignPlannerSchema>
>;
