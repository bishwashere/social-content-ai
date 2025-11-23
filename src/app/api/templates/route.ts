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

export async function GET(request: NextRequest) {
  try {
    await getUserFromToken(request); // Verify auth but don't need user for public templates
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const where: { category?: TemplateCategory } = {};
    if (category && category !== "ALL") {
      where.category = category as TemplateCategory;
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    console.log(`[Templates API] Found ${templates.length} templates for category: ${category || "ALL"}`);

    return NextResponse.json({
      status: 200,
      message: "Templates retrieved successfully",
      data: templates,
    });
  } catch (error) {
    console.error('Error in templates GET:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getUserFromToken(request); // Only authenticated users can create templates
    
    const { title, description, content, category, icon } = await request.json();

    if (!title || !description || !content || !category) {
      return NextResponse.json({ 
        error: "Title, description, content, and category are required" 
      }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        title,
        description,
        content,
        category: category as TemplateCategory,
        icon,
      },
    });

    return NextResponse.json({
      status: 201,
      message: "Template created successfully",
      data: template,
    });
  } catch (error) {
    console.error('Error in templates POST:', error);
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
