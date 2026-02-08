import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adCreativeId } = body;

    if (!adCreativeId) {
      return NextResponse.json(
        { error: "Ad creative ID is required" },
        { status: 400 }
      );
    }

    // Get the ad creative
    const adCreative = await prisma.adCreative.findUnique({
      where: { id: adCreativeId },
      include: {
        brandDiscovery: {
          select: { projectId: true, brandName: true },
        },
      },
    });

    if (!adCreative) {
      return NextResponse.json(
        { error: "Ad creative not found" },
        { status: 404 }
      );
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Build a prompt from the ad's image description and image text overlay
    const imagePrompt = `Create a Facebook ad image for the brand "${adCreative.brandDiscovery.brandName}".

Image concept: ${adCreative.imageDescription}

The image should include this text overlay prominently: "${adCreative.imageCopy}"

Style: Professional, high-quality social media advertisement. Clean layout with the text clearly readable. Modern, eye-catching design suitable for a Facebook/Instagram ad.`;

    console.log(
      `[Ad Image] Generating image for ad creative ${adCreativeId} (angle: ${adCreative.angle})`
    );

    // Call OpenAI DALL-E API
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          response_format: "b64_json",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI DALL-E API error:", errorData);
      return NextResponse.json(
        {
          error:
            errorData.error?.message || "Failed to generate image",
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const base64Image = data.data[0]?.b64_json;

    if (!base64Image) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 }
      );
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, "base64");

    // Upload to R2 under ad-creatives folder
    const filename = `ad-image-${Date.now()}.png`;
    const projectId = adCreative.brandDiscovery.projectId;
    const s3Key = `ad-creatives/${projectId}/${adCreativeId}/${filename}`;

    // Get presigned URL and upload
    const presignedUrl = await s3.getPresignedUrlForVideoUpload(s3Key);

    const uploadResponse = await fetch(presignedUrl, {
      method: "PUT",
      body: imageBuffer,
      headers: {
        "Content-Type": "image/png",
      },
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: "Failed to upload generated image to storage" },
        { status: 500 }
      );
    }

    // Update the ad creative with the image key
    await prisma.adCreative.update({
      where: { id: adCreativeId },
      data: { imageKey: s3Key },
    });

    // Get a signed URL for preview
    const previewUrl = await s3.getSignedUrlForExternalApi(s3Key);

    console.log(
      `[Ad Image] Successfully generated and uploaded image for ad ${adCreativeId}`
    );

    return NextResponse.json({
      success: true,
      imageKey: s3Key,
      imageUrl: previewUrl,
    });
  } catch (error) {
    console.error("Error generating ad image:", error);
    return NextResponse.json(
      { error: "Failed to generate ad image" },
      { status: 500 }
    );
  }
}
