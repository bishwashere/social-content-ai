import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/jwt";
import { TemplateCategory } from "@prisma/client";

// Helper function to get user from JWT token
async function getUserFromToken(request: NextRequest) {
  // Check Authorization header first (from axios)
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.replace("Bearer ", "");
  
  // Fallback to cookie if no Authorization header
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("social-ai-token")?.value;
  }
  
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getUserFromToken(request);
    
    const template = await prisma.template.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json({ 
        error: "Template not found" 
      }, { status: 404 });
    }

    return NextResponse.json({
      status: 200,
      message: "Template retrieved successfully",
      data: template,
    });
  } catch (error) {
    console.error('Error in template GET:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getUserFromToken(request);
    
    const { title, description, content, category, icon } = await request.json();

    const existingTemplate = await prisma.template.findUnique({
      where: { id: params.id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ 
        error: "Template not found" 
      }, { status: 404 });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(content && { content }),
        ...(category && { category: category as TemplateCategory }),
        ...(icon !== undefined && { icon }),
      },
    });

    return NextResponse.json({
      status: 200,
      message: "Template updated successfully",
      data: updatedTemplate,
    });
  } catch (error) {
    console.error('Error in template PUT:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await getUserFromToken(request);
    
    const existingTemplate = await prisma.template.findUnique({
      where: { id: params.id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ 
        error: "Template not found" 
      }, { status: 404 });
    }

    await prisma.template.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      status: 200,
      message: "Template deleted successfully",
    });
  } catch (error) {
    console.error('Error in template DELETE:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
