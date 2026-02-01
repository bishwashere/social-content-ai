"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Folder } from "lucide-react"
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

import React, { useEffect, useState, useMemo } from 'react'
import { All } from "./all"
import { Facebook } from "./facebook"
import { Linkedin } from "./linkedin"
import { Threads } from "./threads"
import { Instagram } from "./instagram"
import { useGetAllProjects, useGetProjectActivityScores } from "@/backend-apis/projects/hooks"
import { useGetAllPlatformMetrics } from '@/backend-apis/metrics/hooks'
import { useSession } from '@/backend-apis/auth/hooks'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tiktok } from "./tiktok"

export const timeRangeOptions = [
  { label: "1 week", value: 7 },
  { label: "1 month", value: 30 },
  { label: "3 months", value: 90 },
  { label: "1 year", value: 365 },
  { label: "5 years", value: 365 * 5 },
];

export type AnalyticsPlatformsProps = {
  timerange: number;
  selectedProject: string | null;
}

// Mini chart component for project cards
const MiniProjectChart = ({ projectId, userId, timeRange = 30 }: { projectId: string; userId: string; timeRange?: number }) => {
  const { data, isLoading } = useGetAllPlatformMetrics(userId, projectId);

  const chartData = useMemo(() => {
    // Default empty data (show flat line at 0)
    const defaultData = Array.from({ length: 7 }, (_, i) => ({
      index: i,
      impressions: 0,
      likes: 0,
      comments: 0,
      posts: 0,
    }));

    if (isLoading || !data?.data || data.data.length === 0) {
      return defaultData;
    }

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - timeRange);

    const filteredData = data.data.filter((item: any) => {
      if (!item || !item.date) return false;
      try {
        const postDate = item.date instanceof Date ? item.date : new Date(item.date);
        return !isNaN(postDate.getTime()) && postDate >= cutoffDate;
      } catch {
        return false;
      }
    });

    // Group posts by day and aggregate metrics
    const postsByDay = new Map<string, {
      dayKey: string;
      impressions: number;
      likes: number;
      comments: number;
      posts: number;
    }>();

    filteredData.forEach((d: any) => {
      try {
        const date = d.date instanceof Date ? d.date : new Date(d.date);
        if (isNaN(date.getTime())) return;
        
        const dayKey = date.toISOString().split('T')[0];

        const existing = postsByDay.get(dayKey);
        if (existing) {
          existing.posts += 1;
          existing.comments += (d.comments || 0);
          existing.likes += (d.likes || 0);
          existing.impressions += (d.impressions || 0);
        } else {
          postsByDay.set(dayKey, {
            dayKey,
            posts: 1,
            comments: d.comments || 0,
            likes: d.likes || 0,
            impressions: d.impressions || 0,
          });
        }
      } catch {
        // Skip invalid dates
      }
    });

    // Convert to array, sort by date, and limit to last 7 days
    const sortedData = Array.from(postsByDay.values())
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
      .slice(-7)
      .map((d, index) => ({
        index: index,
        impressions: d.impressions,
        likes: d.likes,
        comments: d.comments,
        posts: d.posts,
      }));

    // Use default if no data
    const result = sortedData.length > 0 ? sortedData : defaultData;
    return result;
  }, [data, timeRange, isLoading]);

  // Normalize data for visualization (relative scaling)
  const maxImpressions = Math.max(...chartData.map(d => d.impressions), 1);
  const maxLikes = Math.max(...chartData.map(d => d.likes), 1);
  const maxComments = Math.max(...chartData.map(d => d.comments), 1);
  const maxPosts = Math.max(...chartData.map(d => d.posts), 1);
  const maxValue = Math.max(maxImpressions, maxLikes, maxComments, maxPosts, 1);

  const normalizedData = chartData.map(d => ({
    index: d.index,
    impressions: d.impressions / maxValue,
    likes: d.likes / maxValue,
    comments: d.comments / maxValue,
    posts: d.posts / maxValue,
  }));

  return (
    <div className="w-full h-10">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={normalizedData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis hide />
          <YAxis hide domain={[0, 1]} />
          <Bar
            dataKey="impressions"
            fill="#4285F4"
            radius={[1, 1, 0, 0]}
            maxBarSize={3}
          />
          <Bar
            dataKey="posts"
            fill="#3B82F6"
            radius={[1, 1, 0, 0]}
            maxBarSize={3}
          />
          <Line
            type="monotone"
            dataKey="likes"
            stroke="#FF4500"
            strokeWidth={1}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="comments"
            stroke="#FFA500"
            strokeWidth={1}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Map tab value to OAuth platform (lowercase) for filtering
const TAB_TO_PLATFORM: Record<string, string> = {
  Facebook: "facebook",
  Instagram: "instagram",
  Linkedin: "linkedin",
  Threads: "threads",
  Tiktok: "tiktok",
};

const AnalyticsTabs = () => {

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [timerange, setTimerange] = useState<number>(timeRangeOptions[0].value);
  const [activeTab, setActiveTab] = useState<string>("all");
  const projects = useGetAllProjects();
  const { data: activityScores } = useGetProjectActivityScores();
  const { data: session } = useSession();

  // Base list: projects user can access (admin or editor)
  const baseAccessibleProjects = useMemo(() => {
    return projects.data?.filter(project => project.userRole === "admin" || project.userRole === "editor") || [];
  }, [projects.data]);

  // On "All" show all accessible projects; on a platform tab show only projects that have that platform linked
  const accessibleProjects = useMemo(() => {
    let list = baseAccessibleProjects;
    const platform = activeTab !== "all" ? TAB_TO_PLATFORM[activeTab] : null;
    if (platform) {
      list = list.filter((project) =>
        project.projectToOAuthProviders?.some(
          (p) => p.oauthProvider?.platform === platform
        )
      );
    }
    const scores = Array.isArray(activityScores) ? activityScores : [];
    if (!scores.length) return list;
    const scoreMap = new Map(scores.map((s) => [s.projectId, s.score]));
    return [...list].sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0));
  }, [baseAccessibleProjects, activityScores, activeTab]);

  // When tab or filtered list changes, keep selectedProject in the list or pick first
  useEffect(() => {
    if (accessibleProjects.length > 0 && accessibleProjects[0]?.id) {
      setSelectedProject((current) =>
        current && accessibleProjects.some((p) => p.id === current) ? current : accessibleProjects[0].id
      );
    } else {
      setSelectedProject(null);
    }
  }, [accessibleProjects]);

  return (
    <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto py-8 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="Facebook">Facebook</TabsTrigger>
        <TabsTrigger value="Instagram">Instagram</TabsTrigger>
        <TabsTrigger value="Linkedin">Linkedin</TabsTrigger>
        <TabsTrigger value="Threads">Threads</TabsTrigger>
        <TabsTrigger value="Tiktok">Tiktok</TabsTrigger>
      </TabsList>

      {/* Project Selector Cards - Below platform tabs */}
      <div className="w-full mt-4 mb-4">
        {accessibleProjects.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {accessibleProjects.map((project) => {
              const isSelected = selectedProject === project.id;
              return (
                <Card
                  key={project.id}
                  className={`flex flex-col gap-1.5 p-2 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer min-w-[100px] sm:min-w-[120px] ${isSelected
                      ? 'bg-blue-50 dark:bg-transparent border-2 border-blue-300'
                      : 'bg-white dark:bg-transparent shadow-sm'
                    }`}
                  onClick={() => setSelectedProject(project.id || null)}
                >
                  <div className="flex flex-row items-center gap-1.5">
                    <div className={`p-1 rounded-full ${isSelected
                        ? 'text-blue-600 bg-blue-100'
                        : 'text-gray-600 bg-gray-100'
                      }`}>
                      <Folder className="w-3 h-3" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-[9px] font-medium text-gray-500">Project</span>
                      <span className="text-[9px] sm:text-[10px] font-semibold truncate">
                        {project.name || project.id || 'Unnamed Project'}
                      </span>
                    </div>
                  </div>
                  {/* Mini Chart Preview */}
                  {session?.user.id && project.id && (
                    <div className="w-full flex justify-center -mx-2">
                      <MiniProjectChart
                        projectId={project.id}
                        userId={session.user.id}
                        timeRange={30}
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full">
        {projects.data && projects.data.length && selectedProject &&
          <div className='flex justify-end gap-4 items-center'>
            <div className='flex gap-2 items-center xl:-mt-10'>
              <p className='text-sm'>Time Range</p>
              <Select value={String(timerange)} onValueChange={(value) => setTimerange(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timerange" />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      </div>
      <TabsContent value="all">
        <All timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Facebook">
        <Facebook timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Instagram">
        <Instagram timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Linkedin">
        <Linkedin timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Threads">
        <Threads timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Tiktok">
        <Tiktok timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
    </Tabs>
    </div>
  )
}

export { AnalyticsTabs }