"use client";

import { useEffect, useState } from "react";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/backend-apis/auth/hooks";
import { useGetDashboardAnalyticsMetrics } from "@/backend-apis/metrics/hooks";
import { cn } from "@/lib/cn";
import { AnalyticsChart } from "../analytics/_components/tabs/analytics-chart";
import { Skeleton } from "@/components/ui/skeleton";

type TimeRange = 7 | 30 | 90;

const TIME_RANGE_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "3m", value: 90 },
];

type ChartDataPoint = {
  label: string;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalPosts: number;
};

function buildChartData(
  posts: { id: string; date: string; likes: number; comments: number; impressions: number }[],
  timerange: TimeRange
): ChartDataPoint[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - timerange);

  const filtered = posts.filter((p) => {
    const d = new Date(p.date);
    return !isNaN(d.getTime()) && d >= cutoff;
  });

  const byDay = new Map<
    string,
    {
      dayKey: string;
      label: string;
      totalPosts: number;
      totalLikes: number;
      totalComments: number;
      totalImpressions: number;
    }
  >();

  filtered.forEach((p) => {
    const date = new Date(p.date);
    const dayKey = date.toISOString().split("T")[0];
    const label = date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });

    const existing = byDay.get(dayKey);
    if (existing) {
      existing.totalPosts += 1;
      existing.totalLikes += p.likes;
      existing.totalComments += p.comments;
      existing.totalImpressions += p.impressions;
    } else {
      byDay.set(dayKey, {
        dayKey,
        label,
        totalPosts: 1,
        totalLikes: p.likes,
        totalComments: p.comments,
        totalImpressions: p.impressions,
      });
    }
  });

  return Array.from(byDay.values())
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
    .map(({ dayKey: _dayKey, ...rest }) => rest);
}

export function DashboardAnalyticsGraph() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? "";
  const { isLoading, data } = useGetDashboardAnalyticsMetrics(userId);
  const [timeRange, setTimeRange] = useState<TimeRange>(30);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!data?.data || !Array.isArray(data.data)) {
      setChartData([]);
      return;
    }
    setChartData(buildChartData(data.data, timeRange));
  }, [data, timeRange]);

  if (!userId) return null;

  const handleNavigate = () => router.push("/dashboard/analytics");

  return (
    <div
      className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm overflow-hidden cursor-pointer group transition-shadow duration-200 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-700"
      onClick={handleNavigate}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-foreground">Analytics Overview</span>
          <span className="text-xs text-muted-foreground">— all projects</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
        </div>

        {/* Day range selector — stop propagation so clicking a pill doesn't navigate */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60"
          onClick={(e) => e.stopPropagation()}
        >
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-all duration-150",
                timeRange === opt.value
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="px-2 pb-3">
        {isLoading ? (
          <Skeleton className="w-full h-[220px] rounded-xl mt-3" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            No post data in the selected period
          </div>
        ) : (
          <AnalyticsChart chartData={chartData} compact />
        )}
      </div>
    </div>
  );
}
