import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const scheduledPosts = await prisma.scheduledPost.findMany({
      where: {
        projectId: projectId,
      },
      include: {
        oauthProvider: true,
      },
      orderBy: {
        //  latest at top
        createdAt: "desc",
      },
    });

    console.log(`📊 [GET /api/scheduled-posts] Found ${scheduledPosts.length} posts for project ${projectId}`);
    scheduledPosts.forEach((post, idx) => {
      console.log(`   Post ${idx + 1}: platform=${post.platform}, media=${post.media ? 'YES (S3 key)' : 'NO'}, content=${post.content.substring(0, 30)}...`);
    });

    // generate signed url for each post
    const withSignedUrl = await Promise.all(
      scheduledPosts.map(async (p) => {
        if (!p.media) {
          console.log(`   No media for post ${p.id}, returning as-is`);
          return p;
        }
        console.log(`   Converting S3 key to signed URL for post ${p.id}: ${p.media.substring(0, 50)}...`);
        const signedUrl = await s3.getSignedUrlForVideoDownload(p.media);
        console.log(`   Signed URL generated: ${signedUrl.substring(0, 50)}...`);
        return {
          ...p,
          media: signedUrl,
        };
      })
    );

    return NextResponse.json(withSignedUrl);
  } catch (error) {
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduled posts" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required", success: false },
        { status: 400 }
      );
    }

    await prisma.scheduledPost.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating scheduled post:", error);
    return NextResponse.json(
      { error: "Failed to update scheduled post", success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Post ID is required", success: false },
        { status: 400 }
      );
    }

    await prisma.scheduledPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled post:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduled post", success: false },
      { status: 500 }
    );
  }
}
