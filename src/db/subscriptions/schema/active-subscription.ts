import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const ActiveSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
    subscribedAt: {
      type: Date,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "SubscriptionInvoiceSchema",
    },
  },
  {
    timestamps: true,
    collection: "active-subscriptions",
  }
);

const ActiveSubscriptionModel =
  mongoose.models.ActiveSubscriptionSchema ||
  mongoose.model("ActiveSubscriptionSchema", ActiveSubscriptionSchema);
export { ActiveSubscriptionSchema, ActiveSubscriptionModel };

export type ActiveSubscriptionDoc = WithId<
  InferSchemaType<typeof ActiveSubscriptionSchema>
>;
export type ActiveSubscription = Omit<
  ForClient<InferSchemaType<typeof ActiveSubscriptionSchema>>,
  "subscribedAt" | "expiresAt" | "userId"
> & { userId: string; subscribedAt: string; expiresAt: string };
