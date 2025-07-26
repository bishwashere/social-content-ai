import mongoose, { InferSchemaType } from "mongoose";
import { ForClient, WithId } from "@/lib/types";

const CampaignChatSchema = new mongoose.Schema(
  {
    title: { type: String, required: false },
    prompt: { type: String, default: "" },
    day: { type: Number, required: true },
    contents: {
      type: Map,
      of: String,
      required: false,
      default: {},
    },
    status: {
      type: String,
      enum: ["pending", "generated"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const CampaignPlannerSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProjectSchema",
      required: true,
    },
    goal: { type: String, required: true },
    targetAudience: { type: String, required: true },
    chats: [CampaignChatSchema],
    name: { type: String, required: false },
  },
  {
    timestamps: true,
    collection: "campaign-planners",
  }
);

const CampaignPlannerModel =
  mongoose.models.CampaignPlanner ||
  mongoose.model("CampaignPlanner", CampaignPlannerSchema);

export { CampaignPlannerSchema, CampaignPlannerModel };

// Types
export type CampaignPlannerDoc = WithId<InferSchemaType<typeof CampaignPlannerSchema>>;
export type CampaignPlannerType = ForClient<InferSchemaType<typeof CampaignPlannerSchema>>;
