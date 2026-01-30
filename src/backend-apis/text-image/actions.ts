"use server";

import sharp from "sharp";
import { s3 } from "@/lib/s3";
import { getRandomTextCardStyle, TextCardStyle } from "@/constants/text-card-styles";

const IMAGE_SIZE = 1080; // Instagram square format
const PADDING = 80;
const MAX_WIDTH = IMAGE_SIZE - PADDING * 2;
const LINE_HEIGHT = 1.4;

/**
 * Parse CSS gradient to SVG gradient definition
 */
function parseGradientToSvg(background: string, gradientId: string): { defs: string; fill: string } {
  // Check if it's a gradient
  const gradientMatch = background.match(/linear-gradient\((\d+)deg,\s*([^,]+)\s+\d+%,\s*([^)]+)\s+\d+%\)/);
  
  if (gradientMatch) {
    const angle = parseInt(gradientMatch[1]);
    const color1 = gradientMatch[2].trim();
    const color2 = gradientMatch[3].trim();
    
    // Convert angle to x1,y1,x2,y2 coordinates
    const angleRad = (angle - 90) * (Math.PI / 180);
    const x1 = 50 + Math.cos(angleRad + Math.PI) * 50;
    const y1 = 50 + Math.sin(angleRad + Math.PI) * 50;
    const x2 = 50 + Math.cos(angleRad) * 50;
    const y2 = 50 + Math.sin(angleRad) * 50;
    
    const defs = `
      <defs>
        <linearGradient id="${gradientId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
          <stop offset="0%" style="stop-color:${color1}"/>
          <stop offset="100%" style="stop-color:${color2}"/>
        </linearGradient>
      </defs>
    `;
    
    return { defs, fill: `url(#${gradientId})` };
  }
  
  // It's a solid color
  return { defs: "", fill: background };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Word wrap text to fit within max width
 * Returns array of lines
 * Preserves explicit newlines in the text
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  // First split by explicit newlines to preserve them
  const paragraphs = text.split(/\r?\n/);
  const allLines: string[] = [];
  
  for (const paragraph of paragraphs) {
    // If paragraph is empty (from consecutive newlines), add empty line
    if (paragraph.trim() === "") {
      allLines.push("");
      continue;
    }
    
    // Word wrap within each paragraph
    const words = paragraph.split(/[ \t]+/);
    let currentLine = "";
    
    for (const word of words) {
      if (!word) continue; // Skip empty words
      
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          allLines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine) {
      allLines.push(currentLine);
    }
  }
  
  return allLines;
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
 * Generate SVG from text and style
 */
function generateSvg(text: string, style: TextCardStyle): string {
  const fontSize = calculateFontSize(text);
  const charsPerLine = Math.floor(MAX_WIDTH / (fontSize * 0.55)); // Approximate char width
  const lines = wrapText(text, charsPerLine);
  
  const { defs, fill } = parseGradientToSvg(style.background, "bgGradient");
  
  const lineHeightPx = fontSize * LINE_HEIGHT;
  const totalTextHeight = lines.length * lineHeightPx;
  const startY = (IMAGE_SIZE - totalTextHeight) / 2 + fontSize * 0.35; // Center vertically
  
  const textElements = lines.map((line, index) => {
    const y = startY + index * lineHeightPx;
    return `<text x="50%" y="${y}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600" fill="${style.textColor}">${escapeHtml(line)}</text>`;
  }).join("\n    ");
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${IMAGE_SIZE}" height="${IMAGE_SIZE}" viewBox="0 0 ${IMAGE_SIZE} ${IMAGE_SIZE}" xmlns="http://www.w3.org/2000/svg">
  ${defs}
  <rect width="100%" height="100%" fill="${fill}"/>
  <g>
    ${textElements}
  </g>
</svg>`;
}

/**
 * Generate a text card image from content
 * This is FREE - no AI, no credits
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
    // Get style (random or specified)
    const style = styleId 
      ? (await import("@/constants/text-card-styles")).getTextCardStyleById(styleId) || getRandomTextCardStyle()
      : getRandomTextCardStyle();
    
    console.log("[Text Card] Generating image with style:", style.id);
    
    // Generate SVG
    const svg = generateSvg(content, style);
    
    // Convert SVG to PNG using sharp
    const imageBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toBuffer();
    
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
    const { prisma } = await import("@/lib/prisma");
    
    // Get style (random or specified)
    const style = styleId 
      ? (await import("@/constants/text-card-styles")).getTextCardStyleById(styleId) || getRandomTextCardStyle()
      : getRandomTextCardStyle();
    
    console.log("[Text Card for Scheduled Post] Generating image with style:", style.id);
    
    // Generate SVG
    const svg = generateSvg(content, style);
    
    // Convert SVG to PNG using sharp
    const imageBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toBuffer();
    
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
    // Get style (random or specified)
    const style = styleId 
      ? (await import("@/constants/text-card-styles")).getTextCardStyleById(styleId) || getRandomTextCardStyle()
      : getRandomTextCardStyle();
    
    console.log("[Text Card for Quick Generate] Generating image with style:", style.id);
    
    // Generate SVG
    const svg = generateSvg(content, style);
    
    // Convert SVG to PNG using sharp
    const imageBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 90 })
      .toBuffer();
    
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
