import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Get most recent analytics for this project
    const analytics = await prisma.projectAnalytics.findFirst({
      where: { projectId },
      orderBy: { calculatedAt: "desc" },
    });
    
    if (!analytics) {
      return NextResponse.json({
        success: false,
        message: "No analytics found. Calculate analytics first.",
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error("[API] Error fetching project analytics:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
