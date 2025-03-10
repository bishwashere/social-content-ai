import { ForClient, WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const SubscriptionInvoiceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "UserSchema",
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    packageType: {
      type: String,
      required: true,
    },
    stripeInvoiceId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "subscriptions-invoices",
  }
);

const SubscriptionInvoiceModel =
  mongoose.models.SubscriptionInvoiceSchema ||
  mongoose.model("SubscriptionInvoiceSchema", SubscriptionInvoiceSchema);
export { SubscriptionInvoiceSchema, SubscriptionInvoiceModel };

export type SubscriptionInvoiceDoc = WithId<
  InferSchemaType<typeof SubscriptionInvoiceSchema>
>;
export type SubscriptionInvoice = Omit<
  ForClient<InferSchemaType<typeof SubscriptionInvoiceSchema>>,
  "userId" | "date"
> & { userId: string; date: string };
