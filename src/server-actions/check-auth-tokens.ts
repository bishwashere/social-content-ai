"use server";

import { OauthProvidersModel } from "@/db/oauth-providers/schema";
import connectToDb from "@/db/connect";
import mongoose from "mongoose";

export const checkAuthTokens = async (userId: string, platform: string) => {
  try {
    console.log("🔌 Connecting to database");
    await connectToDb();
    console.log("✅ Connected to database successfully");

    console.log(
      `🔍 Finding OAuth provider for userId: ${userId}, platform: ${platform}`
    );
    const data = await OauthProvidersModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      platform: platform === "x" ? "twitter" : platform,
    });

    if (!data) {
      console.log(
        `❌ No OAuth provider found for userId: ${userId}, platform: ${platform}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("❌ Error checking auth tokens:", error);
    console.error(
      "Stack trace:",
      error instanceof Error ? error.stack : "No stack trace available"
    );
    return false;
  }
};
