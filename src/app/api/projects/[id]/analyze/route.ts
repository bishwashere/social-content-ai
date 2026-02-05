import { calculateProjectAnalytics } from "@/backend-apis/analytics/calculator";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    console.log(`[API] Calculating project analytics for ${projectId}`);
    
    const analytics = await calculateProjectAnalytics(projectId);
    
    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error("[API] Error calculating project analytics:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
