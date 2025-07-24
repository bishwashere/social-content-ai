import { WithId } from "@/lib/types";
import mongoose, { InferSchemaType } from "mongoose";

const FirstViewTooltipSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "UserSchema",
        },
        addProject: {
            type: Boolean,
            required: true,
            default: false,
        },
        contentPlanner: {
            type: Boolean,
            required: true,
            default: false,
        },
        quickGenerate: {
            type: Boolean,
            required: true,
            default: false,
        }
    },
    {
        timestamps: true,
        collection: "first-view-tooltip",
    }
);

const FirstViewTooltipModel =
    mongoose.models?.FirstViewTooltipSchema ||
    mongoose.model("FirstViewTooltipSchema", FirstViewTooltipSchema);
export { FirstViewTooltipSchema, FirstViewTooltipModel };

export type FirstViewTooltipRaw = InferSchemaType<typeof FirstViewTooltipSchema>;

export type FirstViewTooltipType = Omit<
  FirstViewTooltipRaw,
  "userId" | "createdAt" | "updatedAt"
>;

type BooleanKeys<T> = {
    [K in keyof T]: T[K] extends boolean ? K : never;
}[keyof T];
export type TooltipKeysType = BooleanKeys<FirstViewTooltipType>;
