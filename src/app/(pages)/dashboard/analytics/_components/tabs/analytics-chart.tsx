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
 * Square-root scaled Y-axis domain.
 *
 * A sqrt scale gives proportionally more chart height to smaller values,
 * where most data lives, and compresses the upper tail of occasional spikes.
 * Example: if most days are ~25 and one day hits 85, the 0-25 band gets
 * ~54 % of the chart height while 25-85 shares the remaining ~46 % —
 * making day-to-day variation around the average clearly visible.
 * Domain stays [0, actual max] so every data point is always shown;
 * the sqrt scale handles the visual compression automatically.
 */
const sqrtDomain = (values: number[]): [number, number] => {
  const max = Math.max(...values.filter(v => v > 0));
  return max > 0 ? [0, max] : [0, 10];
};

const calculatePostsDomain = (chartData: ChartDataPoint[]): [number, number] => {
  if (chartData.length === 0) return [0, 10];
  return sqrtDomain(chartData.map(d => d.totalPosts || 0));
};

const calculateEngagementDomain = (chartData: ChartDataPoint[]): [number, number] => {
  if (chartData.length === 0) return [0, 10];
  return sqrtDomain(chartData.flatMap(d => [
    d.totalImpressions || 0,
    d.totalLikes || 0,
    d.totalComments || 0,
  ]));
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
          scale="sqrt"
          domain={postsDomain}
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
          scale="sqrt"
          orientation="right"
          domain={engagementDomain}
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
