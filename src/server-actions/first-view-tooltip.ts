"use server";
import connectToDb from "@/db/connect";
import { FirstViewTooltipModel, FirstViewTooltipType } from "@/db/first-view-tooltip/schema";
import { Types } from "mongoose";

export async function getFirstViewTooltip(userId: string): Promise<FirstViewTooltipType> {
    if (!Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId");
    }

    await connectToDb();

    // Use lean() for existing docs
    const doc = await FirstViewTooltipModel.findOne({ userId }).lean<FirstViewTooltipType>();

    if (!doc) {
        const created = await FirstViewTooltipModel.create({
            userId,
            addProject: false,
            contentPlanner: false,
            quickGenerate: false,
        });

        return created.toObject() as FirstViewTooltipType; // call .toObject() on Document
    }

    return doc;
}

export async function updateFirstViewTooltip(
    userId: string,
    updateData: Partial<Pick<FirstViewTooltipType, "addProject" | "contentPlanner" | "quickGenerate">>
): Promise<FirstViewTooltipType> {
    if (!Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId");
    }

    await connectToDb();

    const updatedDoc = await FirstViewTooltipModel.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, upsert: true }
    );

    if (!updatedDoc) {
        throw new Error("Unable to update or create tooltip document");
    }

    return updatedDoc.toObject() as FirstViewTooltipType;
}
