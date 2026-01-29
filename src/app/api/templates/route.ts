import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TemplateCategory } from "@prisma/client";
import { getUserFromToken, isAuthenticationError } from "@/lib/auth-utils";
import { toISOString } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
  try {
    await getUserFromToken(request); // Verify auth but don't need user for public templates
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const getCategories = searchParams.get("getCategories") === "true";

    // If requesting categories, return unique categories from database
    if (getCategories) {
      // Use aggregation to get distinct categories directly from MongoDB
      // This bypasses Prisma enum validation
      const categoriesResult = await prisma.$runCommandRaw({
        aggregate: "templates",
        pipeline: [
          { $group: { _id: "$category" } },
          { $sort: { _id: 1 } },
        ],
        cursor: {},
      }) as any;
      
      // Extract categories from the result
      const uniqueCategories = categoriesResult.cursor?.firstBatch?.map((item: any) => item._id) || [];
      
      return NextResponse.json({
        status: 200,
        message: "Categories retrieved successfully",
        data: uniqueCategories,
      });
    }

    const where: { category?: TemplateCategory } = {};
    if (category && category !== "ALL") {
      // Validate category is a valid enum value
      const validCategories = Object.values(TemplateCategory);
      if (validCategories.includes(category as TemplateCategory)) {
        where.category = category as TemplateCategory;
      } else {
        // Invalid category, return empty array
        return NextResponse.json({
          status: 200,
          message: "Templates retrieved successfully",
          data: [],
        });
      }
    }

    // Fetch templates - use raw query to preserve date format from DB
    const rawTemplates = await prisma.$runCommandRaw({
      find: "templates",
      filter: where.category ? { category: where.category } : {},
      sort: { _id: -1 },
    }) as any;
    
    const rawData = rawTemplates.cursor?.firstBatch || [];
    const templates = rawData.map((t: any) => ({
      id: t._id?.$oid || t._id?.toString() || t._id,
      title: t.title,
      description: t.description,
      category: t.category,
      content: t.content,
      icon: t.icon || null,
      source: t.source || null,
      sourcePostId: t.sourcePostId || null,
      impressions: t.impressions ?? null,
      createdAt: toISOString(t.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(t.updatedAt) || new Date().toISOString(),
    }));

    console.log(`[Templates API] Found ${templates.length} templates for category: ${category || "ALL"}`);

    return NextResponse.json({
      status: 200,
      message: "Templates retrieved successfully",
      data: templates,
    });
  } catch (error) {
    console.error('Error in templates GET:', error);
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // Handle Prisma enum errors gracefully
    if (error instanceof Error && error.message.includes("not found in enum")) {
      console.error('[Templates API] Invalid category in database, returning empty array');
      return NextResponse.json({
        status: 200,
        message: "Templates retrieved successfully",
        data: [],
      });
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
    if (isAuthenticationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
