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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);

    const folders = await prisma.projectFolder.findMany({
      where: { userId: user.id },
      include: {
        projectFolderItems: {
          include: {
            project: {
              include: {
                projectChats: {
                  orderBy: { updatedAt: "desc" },
                },
                projectTrackings: true,
                campaignPlanners: {
                  include: {
                    chats: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      status: 200,
      message: "Project folders retrieved successfully",
      data: folders,
    });
  } catch (error) {
    console.error('Error in project folders GET:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const { name, description, color } = await request.json();

    if (!name) {
      return NextResponse.json({ 
        error: "Folder name is required" 
      }, { status: 400 });
    }

    const folder = await prisma.projectFolder.create({
      data: {
        name,
        description,
        color: color || "#3B82F6",
        userId: user.id,
      },
    });

    return NextResponse.json({
      status: 201,
      message: "Project folder created successfully",
      data: folder,
    });
  } catch (error) {
    console.error('Error in project folders POST:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const { id, name, description, color } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ 
        error: "Folder ID and name are required" 
      }, { status: 400 });
    }

    // Verify ownership
    const existingFolder = await prisma.projectFolder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingFolder) {
      return NextResponse.json({ 
        error: "Folder not found or access denied" 
      }, { status: 404 });
    }

    const updatedFolder = await prisma.projectFolder.update({
      where: { id },
      data: {
        name,
        description,
        color,
      },
    });

    return NextResponse.json({
      status: 200,
      message: "Project folder updated successfully",
      data: updatedFolder,
    });
  } catch (error) {
    console.error('Error in project folders PUT:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ 
        error: "Folder ID is required" 
      }, { status: 400 });
    }

    // Verify ownership
    const existingFolder = await prisma.projectFolder.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingFolder) {
      return NextResponse.json({ 
        error: "Folder not found or access denied" 
      }, { status: 404 });
    }

    // Delete the folder (this will cascade delete folder items)
    await prisma.projectFolder.delete({
      where: { id },
    });

    return NextResponse.json({
      status: 200,
      message: "Project folder deleted successfully",
    });
  } catch (error) {
    console.error('Error in project folders DELETE:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
