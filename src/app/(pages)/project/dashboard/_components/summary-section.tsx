// /dashboard/SummarySection.tsx
"use client";

import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { ProjectSummary } from "@/backend-apis/projects/types";
import { UseQueryResult } from "@tanstack/react-query";

export function SummarySection(
  { summary }: { summary: UseQueryResult<ProjectSummary, Error> }
) {
  const barChartData = {
    labels: summary.data?.totalPostsForEachProject?.map((p) => p.name) || [],
    datasets: [
      {
        label: "Posts till now!",
        data: summary.data?.totalPostsForEachProject?.map((p) => p.count) || [],
        backgroundColor: ["#4CAF50", "#FF9800", "#F44336"],
      },
    ],
  };

  if (summary.isLoading) return "Loading"

  return (
    <div className="p-6 bg-gray-100 rounded-md mb-8">
      <p className="font-bold text-sm mb-2 italic underline">Summary:</p>
      <div className="space-y-3">
        <p className="text-sm font-semibold tracking-wide">
          Total Projects: {summary.data?.totalProjects || 0} | Active Platforms: {summary.data?.activePlatforms}/{summary?.data?.totalPlatforms} | Inactive
          Platforms: {summary?.data?.inactivePlatforms}/{summary?.data?.totalPlatforms}
        </p>
        <p className="text-sm font-semibold tracking-wide">
          Most Active Project: {
            summary?.data?.mostActiveProject?.name
          } ({
            summary?.data?.mostActiveProject?.count
          } posts)
        </p>
      </div>
      <div className="mt-6 h-[250px]">
        <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
      </div>
    </div>
  )
}