"use server";

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { s3 } from "@/lib/s3";
import { getRandomTextCardStyle, TextCardStyle } from "@/constants/text-card-styles";
import type { ReactNode } from "react";

const IMAGE_SIZE = 1080; // Instagram square format

// Fetch and cache font for Satori
let fontDataCache: ArrayBuffer | null = null;

async function getFontData(): Promise<ArrayBuffer> {
  if (fontDataCache) {
    return fontDataCache;
  }
  // Use Inter font from Google Fonts (works reliably in serverless)
  const fontUrl =
    "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff";
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.statusText}`);
  }
  fontDataCache = await response.arrayBuffer();
  return fontDataCache;
}

/**
 * Strip emoji and symbols that Inter doesn't support.
 * Noto Color Emoji uses COLR/CPAL (no TrueType outlines), so opentype.js throws
 * "Font doesn't contain TrueType or CFF outlines" if we load it. Strip these
 * characters so the image generates with the rest of the text.
 */
function stripUnsupportedEmojiAndSymbols(text: string): string {
  return (
    text
      // Use only newlines for line breaks; treat tabs as space
      .replace(/\t/g, " ")
      // Emoji & symbol blocks: pictographs, emoticons, symbols, dingbats, flags, variation selectors, ZWJ
      .replace(
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F1E0}-\u{1F1FF}\u{2300}-\u{23FF}\u{2B50}\u{203C}\u{2049}\u{2122}\u{2139}\u{2194}-\u{21AA}\u{231A}\u{231B}\u{23E9}-\u{23FA}\u{24C2}\u{25AA}-\u{25FE}\u{2614}\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}\u{2623}\u{2626}\u{262A}\u{262E}\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267E}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26A7}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27B1}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}]/gu,
        ""
      )
      // Collapse multiple spaces and trim each line
      .replace(/  +/g, " ")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .join("\n")
  );
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
 * Splits text by newlines so each line is rendered on its own line.
 */
async function generateImageBuffer(text: string, style: TextCardStyle): Promise<Buffer> {
  // Strip emoji/symbols that Inter can't render (avoids "Font doesn't contain TrueType or CFF outlines")
  const safeText = stripUnsupportedEmojiAndSymbols(text);
  const fontSize = calculateFontSize(safeText);
  const fontData = await getFontData();
  const gradient = parseGradient(style.background);

  // Split by newlines only – keep empty lines (do not filter) so blank lines show in the image
  const lines = safeText.split(/\r?\n/).map((line) => line.trim());
  // lines may contain "" for blank lines; we render them as nbsp below

  // Content width: card minus padding 80 each side
  const contentWidth = IMAGE_SIZE - 160;

  const lineStyle = {
    display: "block" as const,
    textAlign: "center" as const,
    maxWidth: contentWidth,
    wordBreak: "break-word" as const,
    fontSize,
    fontWeight: 600,
    color: style.textColor,
  };

  // Preserve empty lines: use non-breaking space so the line has height and isn't collapsed
  const lineElements = lines.map((line) => ({
    type: "div",
    props: {
      style: lineStyle,
      children: line.length > 0 ? line : "\u00A0", // \u00A0 = nbsp, keeps empty line visible
    },
  }));

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
            width: contentWidth, // fixed width so every line div is same width and centers
            fontSize: fontSize,
            fontWeight: 600,
            color: style.textColor,
            lineHeight: 1.4,
            wordBreak: "break-word",
          },
          children: lineElements,
        },
      },
    },
  };
  
  // Generate SVG using Satori (cast element to ReactNode for TypeScript)
  const svg = await satori(element as unknown as ReactNode, {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    fonts: [
      { name: "Inter", data: fontData, weight: 600, style: "normal" },
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
