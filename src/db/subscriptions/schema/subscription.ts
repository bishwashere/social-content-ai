import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    invoiceId: {
      required: false,
      type: String,
      default: "",
    },
    status: {
      type: String,
      required: true, // eg. active, inactive, trialing etc
    },
    subscriptionIdFromStripe: {
      required: false,
      type: String,
      default: "",
    },
    customerId: {
      required: false,
      type: String,
      default: "",
      // Stripe customer ID, used to identify the customer in Stripe
    },
  },
  {
    timestamps: true,
    collection: "subscriptions",
  }
);

const SubscriptionModel =
  mongoose?.models?.SubscriptionSchema ||
  mongoose.model("SubscriptionSchema", SubscriptionSchema);
export { SubscriptionSchema, SubscriptionModel };

export type SubscriptionDoc = WithId<
  InferSchemaType<typeof SubscriptionSchema>
>;
export type Subscription = Omit<
  ForClient<InferSchemaType<typeof SubscriptionSchema>>,
  "startedAt" | "endsAt" | "userId"
> & { userId: string; startedAt: string; endsAt: string };
