"use client";

import { useGetAllProjects, useGetAllScheduledPosts } from "@/backend-apis/projects/hooks";
import { useMemo } from "react";
import { startOfWeek, endOfWeek, isWithinInterval, isToday } from "date-fns";

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
      value: stats.postsToday
    },
    {
      title: "Posts(Week)",
      value: stats.postsThisWeek
    },
    {
      title: "Campaigns",
      value: stats.activeCampaigns
    },
    {
      title: "Scheduled",
      value: stats.scheduledPostsCount
    },
    {
      title: "Upcoming",
      value: stats.upcomingScheduledPosts
    },
    {
      title: "Projects",
      value: `${stats.activeProjects}/${stats.totalProjects}`
    }
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {statCards.map((card, index) => (
        <div key={index} className="flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg p-3 min-w-[90px]">
          <div className="text-xs font-medium text-gray-600 mb-1 text-center">
            {card.title}
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
