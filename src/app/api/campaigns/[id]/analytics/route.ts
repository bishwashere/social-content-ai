import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    
    // Get most recent analytics for this campaign
    const analytics = await prisma.campaignAnalytics.findFirst({
      where: { campaignId },
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
    console.error("[API] Error fetching analytics:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
