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
import { useGetAllProjects } from "@/backend-apis/projects/hooks"
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
    }));

    if (isLoading || !data?.data || data.data.length === 0) {
      return defaultData;
    }

    const now = new Date();
    const cutoffDate = new Date(now);
    cutoffDate.setDate(now.getDate() - timeRange);

    const filteredData = data.data
      .filter((item) => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Map to simplified format
    const simplifiedData = filteredData.map((d, index) => ({
      index: index,
      impressions: d.impressions || 0,
      likes: d.likes || 0,
      comments: d.comments || 0,
    }));

    // Limit to last 7 points for mini chart, or use default if empty
    const result = simplifiedData.length > 0 ? simplifiedData.slice(-7) : defaultData;
    return result;
  }, [data, timeRange, isLoading]);

  // Normalize data for visualization (relative scaling)
  const maxImpressions = Math.max(...chartData.map(d => d.impressions), 1);
  const maxLikes = Math.max(...chartData.map(d => d.likes), 1);
  const maxComments = Math.max(...chartData.map(d => d.comments), 1);
  const maxValue = Math.max(maxImpressions, maxLikes, maxComments, 1);

  const normalizedData = chartData.map(d => ({
    index: d.index,
    impressions: d.impressions / maxValue,
    likes: d.likes / maxValue,
    comments: d.comments / maxValue,
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
            maxBarSize={4}
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

const AnalyticsTabs = () => {

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [timerange, setTimerange] = useState<number>(timeRangeOptions[0].value);
  const projects = useGetAllProjects();
  const { data: session } = useSession();

  useEffect(() => {
    if (projects.data && projects.data.length > 0) {
      const adminProjects = projects.data.filter(project => project.userRole === "admin");
      if (adminProjects.length > 0 && adminProjects[0]?.id) {
        setSelectedProject(adminProjects[0].id);
      }
    }
  }, [projects.data])

  const adminProjects = projects.data?.filter(project => project.userRole === "admin") || [];

  return (
    <Tabs defaultValue="all" className="p-3 sm:p-8">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="Facebook">Facebook</TabsTrigger>
        <TabsTrigger value="Linkedin">Linkedin</TabsTrigger>
        <TabsTrigger value="Threads">Threads</TabsTrigger>
        <TabsTrigger value="Tiktok">Tiktok</TabsTrigger>
      </TabsList>

      {/* Project Selector Cards - Below platform tabs */}
      <div className="w-full mt-4 mb-4">
        {adminProjects.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {adminProjects.map((project) => {
              const isSelected = selectedProject === project.id;
              return (
                <Card
                  key={project.id}
                  className={`flex flex-col gap-1.5 p-2 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer min-w-[100px] sm:min-w-[120px] ${isSelected
                      ? 'bg-blue-50 border-2 border-blue-300'
                      : 'bg-white'
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
  )
}

export { AnalyticsTabs }