import { calculateCampaignAnalytics } from "@/backend-apis/analytics/calculator";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id;
    
    console.log(`[API] Calculating analytics for campaign ${campaignId}`);
    
    const analytics = await calculateCampaignAnalytics(campaignId);
    
    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    console.error("[API] Error calculating analytics:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
