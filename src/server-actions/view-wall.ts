"use server";

import { WallModel } from "@/db/wall/schema/wall";

export const viewWall = async (wallId: string) => {
  try {
    await WallModel.findOneAndUpdate(
      {
        _id: wallId,
      },
      {
        $inc: {
          views: 1,
        },
      },
    );
    return true;
  } catch (e) {
    console.error("Error viewing wall", e);
    return false;
  }
};
