"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAllProjects, useGetAllScheduledPosts } from "@/backend-apis/projects/hooks";
import { useMemo } from "react";
import { format, startOfWeek, endOfWeek, isWithinInterval, isToday } from "date-fns";
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  BarChart3, 
  Clock, 
  CheckCircle,
  AlertCircle,
  PlayCircle
} from "lucide-react";

export function CompactStatsCards() {
  const projects = useGetAllProjects();
  const scheduledPosts = useGetAllScheduledPosts();

  const stats = useMemo(() => {
    if (!projects.data) return null;

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Calculate posts this week
    const postsThisWeek = projects.data.reduce((total, project) => {
      const projectPosts = (project.projectTrackings || []).filter(tracking => {
        const postDate = new Date(tracking.date);
        return isWithinInterval(postDate, { start: weekStart, end: weekEnd });
      });
      return total + projectPosts.length;
    }, 0);

    // Calculate posts today
    const postsToday = projects.data.reduce((total, project) => {
      const projectPosts = (project.projectTrackings || []).filter(tracking => {
        const postDate = new Date(tracking.date);
        return isToday(postDate);
      });
      return total + projectPosts.length;
    }, 0);

    // Calculate active campaigns
    const activeCampaigns = projects.data.reduce((total, project) => {
      const projectCampaigns = (project.campaignPlanners || []).filter(planner => {
        if (!planner.startDate) return false;
        const startDate = new Date(planner.startDate);
        const endDate = new Date(startDate.getTime() + (planner.chats?.length || 0) * 24 * 60 * 60 * 1000);
        return now >= startDate && now <= endDate;
      });
      return total + projectCampaigns.length;
    }, 0);

    // Calculate scheduled posts count
    const scheduledPostsCount = scheduledPosts.data?.length;

    // Calculate upcoming scheduled posts (next 7 days)
    const upcomingScheduledPosts = scheduledPosts.data?.filter((post: any) => {
      const postDate = new Date(post.date);
      return postDate > now && postDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }).length || 0;

    // Calculate total projects
    const totalProjects = projects.data.length;

    // Calculate projects with recent activity (last 7 days)
    const activeProjects = projects.data.filter(project => {
      const hasRecentActivity = (project.projectTrackings || []).some(tracking => {
        const postDate = new Date(tracking.date);
        return isWithinInterval(postDate, { start: weekStart, end: weekEnd });
      });
      return hasRecentActivity;
    }).length;

    // Calculate campaign planner future planned posts for next week
    const campaignPlannedPosts = projects.data.reduce((total, project) => {
      const projectPlannedPosts = (project.campaignPlanners || []).reduce((campaignTotal, planner) => {
        if (!planner.startDate) return campaignTotal;
        
        const startDate = new Date(planner.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Count posts planned for next week (today + 6 days)
        const nextWeekPosts = (planner.chats || []).filter(chat => {
          const plannedDate = new Date(startDate.getTime() + (chat.day - 1) * 24 * 60 * 60 * 1000);
          plannedDate.setHours(0, 0, 0, 0);
          
          // Check if this planned date is within the next 7 days (today + 6 days)
          const daysFromToday = Math.floor((plannedDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
          return daysFromToday >= 0 && daysFromToday <= 6;
        }).length;
        
        return campaignTotal + nextWeekPosts;
      }, 0);
      
      return total + projectPlannedPosts;
    }, 0);

    return {
      postsToday,
      postsThisWeek,
      activeCampaigns,
      scheduledPostsCount,
      upcomingScheduledPosts,
      totalProjects,
      activeProjects,
      campaignPlannedPosts
    };
  }, [projects.data, scheduledPosts.data]);

  if (!stats) return null;

  const statCards = [
    {
      title: "Posts Today",
      value: stats.postsToday,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "Content posted today"
    },
    {
      title: "Posts This Week",
      value: stats.postsThisWeek,
      icon: BarChart3,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "Content posted this week"
    },
    {
      title: "Active Campaigns",
      value: stats.activeCampaigns,
      icon: Target,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Campaigns currently running"
    },
    {
      title: "Scheduled Posts",
      value: stats.scheduledPostsCount,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Total posts scheduled"
    },
    {
      title: "Upcoming (7 days)",
      value: stats.upcomingScheduledPosts,
      icon: Clock,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      description: "Posts scheduled this week"
    },
    {
      title: "Active Projects",
      value: `${stats.activeProjects}/${stats.totalProjects}`,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      description: "Projects with recent activity"
    }
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {statCards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow border border-gray-200 min-h-[120px] w-[280px] sm:w-[200px] md:w-[220px] lg:w-[180px]">
          <CardHeader className="flex flex-col items-center space-y-1 pb-2 px-3 pt-3">
            <div className={`p-2 rounded-full ${card.bgColor} mb-1`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <CardTitle className="text-xs font-medium text-gray-600 text-center leading-tight max-w-full break-words">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="text-lg font-bold text-gray-900 text-center mb-1">
              {card.value}
            </div>
            <p className="text-xs text-gray-500 text-center leading-tight max-w-full break-words">
              {card.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
