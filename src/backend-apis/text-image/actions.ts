"use server";

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { s3 } from "@/lib/s3";
import { getRandomTextCardStyle, TextCardStyle } from "@/constants/text-card-styles";
import type { ReactNode } from "react";

const IMAGE_SIZE = 1080; // Instagram square format

// Fetch and cache the font for Satori
let fontDataCache: ArrayBuffer | null = null;

async function getFontData(): Promise<ArrayBuffer> {
  if (fontDataCache) {
    return fontDataCache;
  }
  
  // Use Inter font from Google Fonts (works reliably in serverless)
  const fontUrl = "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff";
  
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.statusText}`);
  }
  
  fontDataCache = await response.arrayBuffer();
  return fontDataCache;
}

/**
 * Parse gradient string to extract colors and angle
 */
function parseGradient(background: string): { isGradient: boolean; color1: string; color2: string; angle: number } {
  const gradientMatch = background.match(/linear-gradient\((\d+)deg,\s*([^,]+)\s+\d+%,\s*([^)]+)\s+\d+%\)/);
  
  if (gradientMatch) {
    return {
      isGradient: true,
      angle: parseInt(gradientMatch[1]),
      color1: gradientMatch[2].trim(),
      color2: gradientMatch[3].trim(),
    };
  }
  
  return {
    isGradient: false,
    color1: background,
    color2: background,
    angle: 0,
  };
}

/**
 * Calculate optimal font size based on text length
 */
function calculateFontSize(text: string): number {
  const length = text.length;
  
  if (length < 50) return 72;
  if (length < 100) return 64;
  if (length < 150) return 56;
  if (length < 200) return 48;
  if (length < 300) return 42;
  if (length < 400) return 36;
  return 32;
}

/**
 * Generate PNG image buffer using Satori + Resvg (serverless-compatible)
 */
async function generateImageBuffer(text: string, style: TextCardStyle): Promise<Buffer> {
  const fontSize = calculateFontSize(text);
  const fontData = await getFontData();
  const gradient = parseGradient(style.background);
  
  // Create the React-like element structure for Satori
  const element = {
    type: "div",
    props: {
      style: {
        width: IMAGE_SIZE,
        height: IMAGE_SIZE,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        background: gradient.isGradient 
          ? `linear-gradient(${gradient.angle}deg, ${gradient.color1}, ${gradient.color2})`
          : gradient.color1,
      },
      children: {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            fontSize: fontSize,
            fontWeight: 600,
            color: style.textColor,
            lineHeight: 1.4,
            wordBreak: "break-word",
          },
          children: text,
        },
      },
    },
  };
  
  // Generate SVG using Satori (cast element to ReactNode for TypeScript)
  const svg = await satori(element as unknown as ReactNode, {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    fonts: [
      {
        name: "Inter",
        data: fontData,
        weight: 600,
        style: "normal",
      },
    ],
  });
  
  // Convert SVG to PNG using Resvg
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: "width",
      value: IMAGE_SIZE,
    },
  });
  
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
}

/**
 * Generate a text card image from content
 * This is FREE - no AI, no credits
 * Uses Satori + Resvg for serverless-compatible image generation
 */
export async function generateTextCardImage({
  content,
  userId,
  campaignId,
  day,
  styleId,
}: {
  content: string;
  userId: string;
  campaignId: string;
  day: number;
  styleId?: string;
}): Promise<{ success: boolean; mediaKey?: string; previewUrl?: string; error?: string }> {
  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Content cannot be empty" };
    }
    
    // Get style (random or specified)
    const style = styleId 
      ? (await import("@/constants/text-card-styles")).getTextCardStyleById(styleId) || getRandomTextCardStyle()
      : getRandomTextCardStyle();
    
    console.log("[Text Card] Generating image with style:", style.id);
    
    // Generate image buffer using Satori
    const imageBuffer = await generateImageBuffer(content, style);
    
    // Upload to S3
    const filename = `text-card-${Date.now()}.png`;
    const s3Key = `campaign-chats/${userId}/${campaignId}/${day}/instagram/${filename}`;
    
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
      console.error("[Text Card] Failed to upload image:", uploadResponse.statusText);
      return { success: false, error: "Failed to upload generated image" };
    }
    
    // Get signed URL for preview
    const previewUrl = await s3.getSignedUrlForVideoDownload(s3Key);
    
    console.log("[Text Card] Image generated successfully:", s3Key);
    
    return { success: true, mediaKey: s3Key, previewUrl };
  } catch (error) {
    console.error("[Text Card] Error generating image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate a text card image for a scheduled post
 * This is FREE - no AI, no credits
 */
export async function generateTextCardImageForScheduledPost({
  content,
  userId,
  scheduledPostId,
  styleId,
}: {
  content: string;
  userId: string;
  scheduledPostId: string;
  styleId?: string;
}): Promise<{ success: boolean; mediaKey?: string; previewUrl?: string; error?: string }> {
  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Content cannot be empty" };
    }
    
    const { prisma } = await import("@/lib/prisma");
    
    // Get style (random or specified)
    const style = styleId 
      ? (await import("@/constants/text-card-styles")).getTextCardStyleById(styleId) || getRandomTextCardStyle()
      : getRandomTextCardStyle();
    
    console.log("[Text Card for Scheduled Post] Generating image with style:", style.id);
    
    // Generate image buffer using Satori
    const imageBuffer = await generateImageBuffer(content, style);
    
    // Upload to S3
    const filename = `text-card-${Date.now()}.png`;
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
      console.error("[Text Card for Scheduled Post] Failed to upload image:", uploadResponse.statusText);
      return { success: false, error: "Failed to upload generated image" };
    }
    
    // Update the scheduled post with the new media
    await prisma.scheduledPost.update({
      where: { id: scheduledPostId },
      data: { media: s3Key },
    });
    
    // Get signed URL for preview
    const previewUrl = await s3.getSignedUrlForVideoDownload(s3Key);
    
    console.log("[Text Card for Scheduled Post] Image generated successfully:", s3Key);
    
    return { success: true, mediaKey: s3Key, previewUrl };
  } catch (error) {
    console.error("[Text Card for Scheduled Post] Error generating image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Generate a text card image for Quick Generate (ProjectChat)
 * This is FREE - no AI, no credits
 * Note: This is NOT a server action - it's called directly from the API route
 */
export async function generateTextCardImageForQuickGenerate({
  content,
  userId,
  projectId,
  styleId,
}: {
  content: string;
  userId: string;
  projectId: string;
  styleId?: string;
}): Promise<{ success: boolean; mediaKey?: string; previewUrl?: string; error?: string }> {
  try {
    // Validate content
    if (!content || content.trim().length === 0) {
      return { success: false, error: "Content cannot be empty" };
    }
    
    // Get style (random or specified)
    const style = styleId 
      ? (await import("@/constants/text-card-styles")).getTextCardStyleById(styleId) || getRandomTextCardStyle()
      : getRandomTextCardStyle();
    
    console.log("[Text Card for Quick Generate] Generating image with style:", style.id);
    
    // Generate image buffer using Satori
    const imageBuffer = await generateImageBuffer(content, style);
    
    // Upload to S3
    const filename = `text-card-${Date.now()}.png`;
    const s3Key = `project-chats/${userId}/${projectId}/instagram/${filename}`;
    
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
      console.error("[Text Card for Quick Generate] Failed to upload image:", uploadResponse.statusText);
      return { success: false, error: "Failed to upload generated image" };
    }
    
    // Get signed URL for preview
    const previewUrl = await s3.getSignedUrlForVideoDownload(s3Key);
    
    console.log("[Text Card for Quick Generate] Image generated successfully:", s3Key);
    
    return { success: true, mediaKey: s3Key, previewUrl };
  } catch (error) {
    console.error("[Text Card for Quick Generate] Error generating image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
