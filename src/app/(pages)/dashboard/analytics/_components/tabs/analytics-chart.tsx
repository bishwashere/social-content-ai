"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  TooltipProps,
} from "recharts";
import { CHART_COLORS } from "@/constants/colors";

// Label mapping for tooltip and legend
const DATA_KEY_LABELS: Record<string, string> = {
  totalImpressions: "Impressions",
  totalLikes: "Likes",
  totalComments: "Comments",
  totalPosts: "Posts",
};

type ChartDataPoint = {
  label: string;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalPosts: number;
};

type AnalyticsChartProps = {
  chartData: ChartDataPoint[];
  /** When true, renders without the Card shell and at a reduced height (for dashboard widgets). */
  compact?: boolean;
};

const ChartTooltip = ({ active, label, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) return null;

  // Sort payload: Posts → Impressions → Likes → Comments
  const sortOrder = ['totalPosts', 'totalImpressions', 'totalLikes', 'totalComments'];
  const sortedPayload = [...payload].sort((a, b) => {
    const indexA = sortOrder.indexOf(a.dataKey as string);
    const indexB = sortOrder.indexOf(b.dataKey as string);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <div className="bg-white dark:bg-[hsl(215,44%,22%)] p-3 border rounded shadow text-sm">
      <p className="font-bold mb-2">{label}</p>
      {sortedPayload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name && DATA_KEY_LABELS[entry.name] || entry.name}</span>
          </div>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Calculate Y-axis domain for posts (left axis)
 */
const calculatePostsDomain = (chartData: ChartDataPoint[]): [number, number] | [number, "auto"] => {
  if (chartData.length === 0) return [0, 10];
  const maxPosts = Math.max(...chartData.map(d => d.totalPosts || 0));
  return maxPosts === 0 ? [0, 10] : [0, "auto"];
};

/**
 * Calculate Y-axis domain for engagement metrics (right axis)
 */
const calculateEngagementDomain = (chartData: ChartDataPoint[]): [number, number] | [number, "auto"] => {
  if (chartData.length === 0) return [0, 10];
  const maxImpressions = Math.max(...chartData.map(d => d.totalImpressions || 0));
  const maxLikes = Math.max(...chartData.map(d => d.totalLikes || 0));
  const maxComments = Math.max(...chartData.map(d => d.totalComments || 0));
  const maxValue = Math.max(maxImpressions, maxLikes, maxComments);
  return maxValue === 0 ? [0, 10] : [0, "auto"];
};

export const AnalyticsChart = ({ chartData, compact = false }: AnalyticsChartProps) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 640);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const postsDomain = calculatePostsDomain(chartData);
  const engagementDomain = calculateEngagementDomain(chartData);

  const chart = (
    <ResponsiveContainer width="100%" height={compact ? 220 : 300} className="flex">
      <ComposedChart
        data={chartData}
        margin={isMobile ? { left: -18, right: -29 } : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          padding={{ left: 0, right: 0 }}
          tick={{ fontSize: 13 }}
        />

        {/* Left Y-axis: Number of Posts */}
        <YAxis
          yAxisId="left"
          domain={postsDomain as any}
          allowDecimals={false}
          label={!isMobile && !compact ? {
            value: "Number of Posts",
            angle: -90,
            position: "insideLeft",
            offset: 10,
            style: { textAnchor: "middle", fill: "#666", fontSize: 13 },
          } : undefined}
          tick={{ fontSize: 10 }}
        />

        {/* Right Y-axis: Engagement Metrics */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={engagementDomain as any}
          label={!isMobile && !compact ? {
            value: "Impressions / Likes / Comments",
            angle: 90,
            position: "insideRight",
            offset: 10,
            style: { textAnchor: "middle", fill: "#666", fontSize: 13 },
          } : undefined}
          tick={{ fontSize: 13 }}
        />

        <Tooltip content={<ChartTooltip />} />

        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="center"
          wrapperStyle={{ paddingTop: 8 }}
          formatter={(value) => DATA_KEY_LABELS[value] || value}
        />

        {/* Bar: Posts Count (left axis) */}
        <Bar
          yAxisId="left"
          dataKey="totalPosts"
          maxBarSize={isMobile ? 20 : 40}
          fill={CHART_COLORS.posts}
          radius={[4, 4, 0, 0]}
        />

        {/* Line: Impressions (right axis) */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="totalImpressions"
          stroke={CHART_COLORS.impressions}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.impressions, stroke: "#fff", r: 4 }}
        />

        {/* Line: Likes (right axis) */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="totalLikes"
          stroke={CHART_COLORS.likes}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.likes, stroke: "#fff", r: 4 }}
        />

        {/* Line: Comments (right axis) */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="totalComments"
          stroke={CHART_COLORS.comments}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS.comments, stroke: "#fff", r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  if (compact) {
    return <div className="w-full px-2 pt-1">{chart}</div>;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <TrendingUp className="size-5" />
          <p className="text-xl">Social Post Performance</p>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex p-0 sm:p-4 md:p-7 lg:p-10 w-full">
        {chart}
      </CardContent>
    </Card>
  );
};

export const AnalyticsChartSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex gap-2 items-center">
        <TrendingUp className="size-5" />
        <p className="text-xl">Social Post Performance</p>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0 sm:p-4 md:p-7 lg:p-10 w-full">
      <Skeleton className="w-full h-[300px] rounded-md" />
    </CardContent>
  </Card>
);
