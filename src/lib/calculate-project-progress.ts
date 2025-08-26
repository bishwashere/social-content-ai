import { ProjectWithChats } from "@/backend-apis/projects/types";

export function calculateProjectProgress(project: ProjectWithChats): number {
  if (!project.campaignPlanners || project.campaignPlanners.length === 0) {
    return 0; // No campaign planners, so 0% progress
  }

  let totalProgress = 0;
  let totalCampaigns = 0;

  project.campaignPlanners.forEach(planner => {
    if (planner.chats && planner.chats.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use startDate if available, otherwise fall back to createdAt
      const baseDate = planner.startDate ? new Date(planner.startDate) : new Date(planner.createdAt);
      baseDate.setHours(0, 0, 0, 0);
      
      const totalDays = planner.chats.length;
      const passedDays = planner.chats.filter(chat => {
        const chatDate = new Date(baseDate.getTime() + (chat.day - 1) * 86400000);
        chatDate.setHours(0, 0, 0, 0);
        return chatDate < today;
      }).length;

      const campaignProgress = totalDays > 0 ? (passedDays / totalDays) * 100 : 0;
      totalProgress += campaignProgress;
      totalCampaigns++;
    }
  });

  if (totalCampaigns === 0) {
    return 0; // No chats in any campaign planners
  }

  return Math.round(totalProgress / totalCampaigns);
}
