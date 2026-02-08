"use server";

import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

const CREDITS_PER_IMAGE = 5;

// Base prompt applied to all styles
const IMAGE_PROMPT_BASE =
  "Clean, professional social media illustration. No text, no letters, no numbers, no symbols. Modern flat vector style, premium tech aesthetic. Limit to a maximum of two visual elements. Single abstract shape with minimal internal detail.";

// Array of prompt styles that rotate randomly
const IMAGE_PROMPT_STYLES = [
  "Minimal abstract illustration with a central focal point and subtle outward motion, inviting interaction.",
  "Abstract illustration showing balanced tension around a central point, controlled motion, neutral modern tech palette.",
  "Clean modern illustration with strong forward motion lines and streamlined flow, confident tech aesthetic.",
  "Minimal illustration with a calm central element and generous negative space, balanced composition.",
  "Abstract illustration with subtle directional movement and restrained glow.",
];

export const generateAIImage = async ({
  userId,
  content,
  campaignId,
  day,
  platform,
}: {
  userId: string;
  content: string;
  campaignId: string;
  day: number;
  platform: string;
}): Promise<{ success: boolean; mediaKey?: string; previewUrl?: string; error?: string }> => {
  try {
    // Check if user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.remainingChatGenerations < CREDITS_PER_IMAGE) {
      return {
        success: false,
        error: `You need ${CREDITS_PER_IMAGE} credits to generate an image. You have ${user.remainingChatGenerations} credits.`,
      };
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return { success: false, error: "OpenAI API key not configured" };
    }

    // Select a random prompt style
    const randomStyle = IMAGE_PROMPT_STYLES[Math.floor(Math.random() * IMAGE_PROMPT_STYLES.length)];
    
    // Create the prompt for image generation (base + random style only, no content influence)
    const imagePrompt = `${IMAGE_PROMPT_BASE} ${randomStyle}`;

    console.log("[AI Image] Final prompt:", imagePrompt);

    // Call OpenAI DALL-E API
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return { success: false, error: errorData.error?.message || "Failed to generate image" };
    }

    const data = await response.json();
    const base64Image = data.data[0]?.b64_json;

    if (!base64Image) {
      return { success: false, error: "No image generated" };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Upload to S3
    const filename = `ai-generated-${Date.now()}.png`;
    const s3Key = `campaign-chats/${userId}/${campaignId}/${day}/${platform}/${filename}`;

    // Get presigned URL for upload
    const presignedUrl = await s3.getPresignedUrlForVideoUpload(s3Key);

    // Upload the image
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: imageBuffer,
      headers: {
        "Content-Type": "image/png",
      },
    });

    if (!uploadResponse.ok) {
      return { success: false, error: "Failed to upload generated image" };
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: {
        remainingChatGenerations: {
          decrement: CREDITS_PER_IMAGE,
        },
      },
    });

    // Get signed URL for preview
    const previewUrl = await s3.getSignedUrlForVideoDownload(s3Key);

    return { success: true, mediaKey: s3Key, previewUrl };
  } catch (error) {
    console.error("Error generating AI image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Generate AI image for Quick Generate (ProjectChat)
 */
export const generateAIImageForQuickGenerate = async ({
  userId,
  content,
  projectId,
  platform,
}: {
  userId: string;
  content: string;
  projectId: string;
  platform: string;
}): Promise<{ success: boolean; mediaKey?: string; previewUrl?: string; error?: string }> => {
  try {
    // Check if user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.remainingChatGenerations < CREDITS_PER_IMAGE) {
      return {
        success: false,
        error: `You need ${CREDITS_PER_IMAGE} credits to generate an image. You have ${user.remainingChatGenerations} credits.`,
      };
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return { success: false, error: "OpenAI API key not configured" };
    }

    // Select a random prompt style
    const randomStyle = IMAGE_PROMPT_STYLES[Math.floor(Math.random() * IMAGE_PROMPT_STYLES.length)];
    
    // Create the prompt for image generation (base + random style only, no content influence)
    const imagePrompt = `${IMAGE_PROMPT_BASE} ${randomStyle}`;

    console.log("[AI Image for Quick Generate] Final prompt:", imagePrompt);

    // Call OpenAI DALL-E API
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return { success: false, error: errorData.error?.message || "Failed to generate image" };
    }

    const data = await response.json();
    const base64Image = data.data[0]?.b64_json;

    if (!base64Image) {
      return { success: false, error: "No image generated" };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Upload to S3
    const filename = `ai-generated-${Date.now()}.png`;
    const s3Key = `project-chats/${userId}/${projectId}/${platform}/${filename}`;

    // Get presigned URL for upload
    const presignedUrl = await s3.getPresignedUrlForVideoUpload(s3Key);

    // Upload the image
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: imageBuffer,
      headers: {
        "Content-Type": "image/png",
      },
    });

    if (!uploadResponse.ok) {
      return { success: false, error: "Failed to upload generated image" };
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: {
        remainingChatGenerations: {
          decrement: CREDITS_PER_IMAGE,
        },
      },
    });

    // Get signed URL for preview
    const previewUrl = await s3.getSignedUrlForVideoDownload(s3Key);

    return { success: true, mediaKey: s3Key, previewUrl };
  } catch (error) {
    console.error("Error generating AI image for quick generate:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

/**
 * Generate AI image for a scheduled post
 */
export const generateAIImageForScheduledPost = async ({
  userId,
  scheduledPostId,
  content,
}: {
  userId: string;
  scheduledPostId: string;
  content: string;
}): Promise<{ success: boolean; mediaKey?: string; previewUrl?: string; error?: string }> => {
  try {
    // Check if user has enough credits
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (user.remainingChatGenerations < CREDITS_PER_IMAGE) {
      return {
        success: false,
        error: `You need ${CREDITS_PER_IMAGE} credits to generate an image. You have ${user.remainingChatGenerations} credits.`,
      };
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return { success: false, error: "OpenAI API key not configured" };
    }

    // Select a random prompt style
    const randomStyle = IMAGE_PROMPT_STYLES[Math.floor(Math.random() * IMAGE_PROMPT_STYLES.length)];
    
    // Create the prompt for image generation (base + random style only, no content influence)
    const imagePrompt = `${IMAGE_PROMPT_BASE} ${randomStyle}`;

    console.log("[AI Image for Scheduled Post] Final prompt:", imagePrompt);

    // Call OpenAI DALL-E API
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error:", errorData);
      return { success: false, error: errorData.error?.message || "Failed to generate image" };
    }

    const data = await response.json();
    const base64Image = data.data[0]?.b64_json;

    if (!base64Image) {
      return { success: false, error: "No image generated" };
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Upload to S3
    const filename = `ai-generated-${Date.now()}.png`;
    const s3Key = `scheduled-posts/${userId}/${scheduledPostId}/${filename}`;

    // Get presigned URL for upload
    const presignedUrl = await s3.getPresignedUrlForVideoUpload(s3Key);

    // Upload the image
    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: imageBuffer,
      headers: {
        "Content-Type": "image/png",
      },
    });

    if (!uploadResponse.ok) {
      return { success: false, error: "Failed to upload generated image" };
    }

    // Deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: {
        remainingChatGenerations: {
          decrement: CREDITS_PER_IMAGE,
        },
      },
    });

    // Update the scheduled post with the new media
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { media: s3Key },
    });

    // Get signed URL for preview
    const previewUrl = await s3.getSignedUrlForVideoDownload(s3Key);

    return { success: true, mediaKey: s3Key, previewUrl };
  } catch (error) {
    console.error("Error generating AI image for scheduled post:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
