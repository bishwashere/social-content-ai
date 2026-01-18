import { NextRequest, NextResponse } from "next/server";
import { getCampaignPlannerMetadata } from "@/backend-apis/campaign-planner/index";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const result = await getCampaignPlannerMetadata(projectId, limit);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Error in /api/campaign-planner/metadata:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        chatsGroupedByCampaign: [],
        hasOldCampaigns: false,
      },
      { status: 500 }
    );
  }
}
