"use server";

import { ScheduledPostsModel } from "@/db/scheduled-posts/schema";
import connectToDb from "@/db/connect";
import mongoose from "mongoose";

type Props = {
  userId: string;
  platform: string;
  content: string;
  date: number;
};

export const schedulePost = async (props: Props) => {
  try {
    console.log("🔌 Connecting to database");
    await connectToDb();
    console.log("✅ Connected to database successfully");

    console.log(
      `🔍 Scheduling post for userId: ${props.userId}, platform: ${props.platform}, date: ${props.date}`
    );
    const data = await ScheduledPostsModel.create({
      userId: new mongoose.Types.ObjectId(props.userId),
      platform: props.platform,
      content: props.content,
      date: new Date(props.date * 1000),
    });

    if (!data) {
      console.log(
        `❌ Failed to schedule post for userId: ${props.userId}, platform: ${props.platform}, date: ${props.date}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Error scheduling post:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return false;
  }
};
