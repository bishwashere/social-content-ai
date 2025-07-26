// model UploadedVideo {
//   id        String   @id @default(auto()) @map("_id") @db.ObjectId
//   folderId  String
//   createdAt DateTime @default(now())
//   updatedAt DateTime @updatedAt
//   user      User     @relation(fields: [userId], references: [id])
//   userId    String   @db.ObjectId
//   text      String
//   status    String   @default("pending")
// }

import { WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const UploadedVideosSchema = new mongoose.Schema(
  {
    folderId: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
    text: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "pending",
    },
    projectId: {
      type: String,
      required: true,
    },
    campaignPlannerId: {
      type: String,
      required: true,
    },
    day: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "uploaded-videos",
  }
);

const UploadedVideosModel =
  mongoose.models?.UploadedVideosSchema ||
  mongoose.model("UploadedVideosSchema", UploadedVideosSchema);
export { UploadedVideosSchema, UploadedVideosModel };

export type UploadedVideosDoc = WithId<
  InferSchemaType<typeof UploadedVideosSchema>
>;
