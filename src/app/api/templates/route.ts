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

    // Fetch templates - handle date conversion errors
    let templates;
    try {
      templates = await prisma.template.findMany({
        where,
        orderBy: { id: "desc" },
      });
    } catch (dateError: any) {
      // If error is due to date conversion, use raw query
      if (dateError?.code === 'P2023' || dateError?.message?.includes('Failed to convert')) {
        console.warn('[Templates API] Date conversion error, using raw query');
        const rawTemplates = await prisma.$runCommandRaw({
          find: "templates",
          filter: where.category ? { category: where.category } : {},
          sort: { _id: -1 },
        }) as any;
        
        const rawData = rawTemplates.cursor?.firstBatch || [];
        const now = new Date();
        templates = rawData.map((t: any) => {
          // Helper to safely convert date from MongoDB
          const safeDate = (dateValue: any): Date => {
            if (!dateValue) return now;
            if (dateValue instanceof Date) {
              return isNaN(dateValue.getTime()) ? now : dateValue;
            }
            if (typeof dateValue === 'string') {
              const parsed = new Date(dateValue);
              return isNaN(parsed.getTime()) ? now : parsed;
            }
            // Handle MongoDB date format { $date: "..." }
            if (dateValue && typeof dateValue === 'object' && dateValue.$date) {
              const parsed = new Date(dateValue.$date);
              return isNaN(parsed.getTime()) ? now : parsed;
            }
            return now;
          };

          return {
            id: t._id?.$oid || t._id?.toString() || t._id,
            title: t.title,
            description: t.description,
            category: t.category,
            content: t.content,
            icon: t.icon || null,
            source: t.source || null,
            sourcePostId: t.sourcePostId || null,
            createdAt: safeDate(t.createdAt),
            updatedAt: safeDate(t.updatedAt),
          };
        });
      } else {
        throw dateError;
      }
    }

    // Ensure all templates have valid dates and convert to ISO strings
    const now = new Date();
    templates = templates.map((template: any) => {
      // Helper to safely convert to Date
      const safeDate = (dateValue: any): Date => {
        if (!dateValue) return now;
        if (dateValue instanceof Date) {
          return isNaN(dateValue.getTime()) ? now : dateValue;
        }
        if (typeof dateValue === 'string') {
          const parsed = new Date(dateValue);
          return isNaN(parsed.getTime()) ? now : parsed;
        }
        // Handle MongoDB date format { $date: "..." }
        if (dateValue && typeof dateValue === 'object' && dateValue.$date) {
          const parsed = new Date(dateValue.$date);
          return isNaN(parsed.getTime()) ? now : parsed;
        }
        return now;
      };

      const createdAt = safeDate(template.createdAt);
      const updatedAt = safeDate(template.updatedAt);

      return {
        ...template,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      };
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
    if (error instanceof Error && error.message.includes("authentication")) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
