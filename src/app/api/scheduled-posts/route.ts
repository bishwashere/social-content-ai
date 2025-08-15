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
      orderBy: {
        //  latest at top
        createdAt: "desc",
      },
    });

    // generate signed url for each post
    const withSignedUrl = await Promise.all(
      scheduledPosts.map(async (p) => {
        if (!p.media) return p;
        const signedUrl = await s3.getSignedUrlForVideoDownload(p.media);
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
