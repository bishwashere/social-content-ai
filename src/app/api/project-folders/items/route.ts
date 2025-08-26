import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";

// Helper function to get user from JWT token
async function getUserFromToken(request: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("social-ai-token")?.value;
  
  if (!token) {
    throw new Error("No authentication token found");
  }

  const payload = verifyJWT(token, process.env.JWT_SECRET as string);
  if (!payload) {
    throw new Error("Invalid authentication token");
  }

  const user = await prisma.user.findUnique({
    where: { email: payload.email }
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const { folderId, projectId } = await request.json();

    if (!folderId || !projectId) {
      return NextResponse.json({ 
        error: "Folder ID and Project ID are required" 
      }, { status: 400 });
    }

    // Verify ownership of folder
    const folder = await prisma.projectFolder.findFirst({
      where: { id: folderId, userId: user.id },
    });

    if (!folder) {
      return NextResponse.json({ 
        error: "Folder not found or access denied" 
      }, { status: 404 });
    }

    // Verify access to project (owner or invited)
    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.id },
          { invitedUsers: { some: { userId: user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ 
        error: "Project not found or access denied" 
      }, { status: 404 });
    }

    // Check if project is already in folder
    const existingItem = await prisma.projectFolderItem.findFirst({
      where: { folderId, projectId },
    });

    if (existingItem) {
      return NextResponse.json({ 
        error: "Project is already in this folder" 
      }, { status: 400 });
    }

    const folderItem = await prisma.projectFolderItem.create({
      data: {
        folderId,
        projectId,
      },
      include: {
        project: {
          include: {
            projectChats: {
              orderBy: { updatedAt: "desc" },
            },
          },
        },
      },
    });

    return NextResponse.json({
      status: 201,
      message: "Project added to folder successfully",
      data: folderItem,
    });
  } catch (error) {
    console.error('Error in project folder items POST:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");
    const projectId = searchParams.get("projectId");

    if (!folderId || !projectId) {
      return NextResponse.json({ 
        error: "Folder ID and Project ID are required" 
      }, { status: 400 });
    }

    // Verify ownership of folder
    const folder = await prisma.projectFolder.findFirst({
      where: { id: folderId, userId: user.id },
    });

    if (!folder) {
      return NextResponse.json({ 
        error: "Folder not found or access denied" 
      }, { status: 404 });
    }

    // Verify access to project (owner or invited)
    const project = await prisma.projects.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: user.id },
          { invitedUsers: { some: { userId: user.id } } },
        ],
      },
    });

    if (!project) {
      return NextResponse.json({ 
        error: "Project not found or access denied" 
      }, { status: 404 });
    }

    // Remove project from folder
    await prisma.projectFolderItem.deleteMany({
      where: { folderId, projectId },
    });

    return NextResponse.json({
      status: 200,
      message: "Project removed from folder successfully",
    });
  } catch (error) {
    console.error('Error in project folder items DELETE:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
