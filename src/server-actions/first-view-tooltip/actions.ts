"use server";
import connectToDb from "@/db/connect";
import { FirstViewTooltipModel, FirstViewTooltipType } from "@/db/first-view-tooltip/schema";
import { Types } from "mongoose";

export type UpdateFirstViewTooltipData = {
    userId: string,
    updateData: Partial<Pick<FirstViewTooltipType, "addProject" | "contentPlanner" | "quickGenerate">>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function plainTooltipDoc(doc: any): FirstViewTooltipType {
    return {
        ...doc,
        _id: doc._id.toString(),
        userId: doc.userId.toString(),
        createdAt: doc.createdAt?.toISOString(),
        updatedAt: doc.updatedAt?.toISOString(),
    };
}

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

        return created.toObject()
    }

    return plainTooltipDoc(doc);
}

export async function updateFirstViewTooltip({ userId, updateData }: UpdateFirstViewTooltipData): Promise<FirstViewTooltipType> {
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

    return plainTooltipDoc(updatedDoc.toObject());
}

export async function resetFirstViewTooltip(
    userId: string,
): Promise<FirstViewTooltipType> {
    if (!Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId");
    }

    await connectToDb();

    const resetData = {
        addProject: false,
        contentPlanner: false,
        quickGenerate: false,
    }

    const updatedDoc = await FirstViewTooltipModel.findOneAndUpdate(
        { userId },
        { $set: resetData },
        { new: true, upsert: true }
    );

    if (!updatedDoc) {
        throw new Error("Unable to update or create tooltip document");
    }

    return plainTooltipDoc(updatedDoc.toObject());
}
