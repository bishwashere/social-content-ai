"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircleMore, MousePointerClick, Send, ThumbsUp, TrendingUp, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
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

type Props = {
  totalPosts: number;
  totalLikes: number;
  totalFollowers: number;
  totalImpressions: number;
  totalComments: number;
  chartData: {
    label: string;
    totalImpressions: number;
    totalLikes: number;
    totalComments: number;
  }[]
}

const ViewAnalytics = ({ totalPosts, totalLikes, totalFollowers, totalImpressions, totalComments, chartData }: Props) => {

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkScreen(); // Initial check
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const CustomTooltip = ({ active, label, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) return null;

    const nameMap: Record<string, string> = {
      totalImpressions: "Impressions",
      totalLikes: "Likes",
      totalComments: "Comments",
      totalPosts: "Posts",
    };
    return (
      <div className="bg-white p-3 border rounded shadow text-sm">
        <p className="font-bold mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              ></span>
              <span>{entry.name && nameMap[entry.name] || entry.name}</span>
            </div>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };


  return (
    <div className="">
      <div className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 border-2 border-secondary rounded-xl py-2 md:py-4">

        {/* Total posts */}
        <div className="flex gap-2 px-4 my-2 border-r-2 border-secondary">
          <div className="w-fit h-fit rounded-full p-2 bg-blue-100">
            <Send className="w-5 h-5 stroke-blue-600" />
          </div>
          <div className="flex flex-col gap-2">
            <p>Number of Posts</p>
            <p className="text-xl font-bold">{totalPosts}</p>
          </div>
        </div>

        {/* Total Likes */}
        <div className="flex gap-2 px-4 my-2 border-r-2 border-secondary">
          <div className="w-fit h-fit rounded-full p-2 bg-green-100">
            <ThumbsUp className="w-5 h-5 stroke-green-600" />
          </div>
          <div className="flex flex-col gap-2">
            <p>Total Likes</p>
            <p className="text-xl font-bold">{totalLikes}</p>
          </div>
        </div>

        {/* Total Followers */}
        <div className="flex gap-2 px-4 my-2 border-r-2 border-secondary">
          <div className="w-fit h-fit rounded-full p-2 bg-teal-100">
            <Users className="w-5 h-5 stroke-teal-600" />
          </div>
          <div className="flex flex-col gap-2">
            <p>Total Followers</p>
            <p className="text-xl font-bold">{totalFollowers}</p>
          </div>
        </div>

        {/* Total Impressions */}
        <div className="flex gap-2 px-4 my-2 border-r-2 border-secondary">
          <div className="w-fit h-fit rounded-full p-2 bg-purple-100">
            <MousePointerClick className="w-5 h-5 stroke-purple-600" />
          </div>
          <div className="flex flex-col gap-2">
            <p>Total Impressions</p>
            <p className="text-xl font-bold">{totalImpressions}</p>
          </div>
        </div>

        {/* Total Comments */}
        <div className="flex gap-2 px-4 my-2">
          <div className="w-fit h-fit rounded-full p-2 bg-pink-100">
            <MessageCircleMore className="w-5 h-5 stroke-pink-500" />
          </div>
          <div className="flex flex-col gap-2">
            <p>Total Comments</p>
            <p className="text-xl font-bold">{totalComments}</p>
          </div>
        </div>

      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center">
            <TrendingUp className="size-5" />
            <p className="text-xl">Social Post Performance</p>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex p-0 sm:p-4 md:p-7 lg:p-10 w-full">
          <ResponsiveContainer width="100%" height={300} className="flex">
            <ComposedChart data={chartData} margin={isMobile ? { left: -18, right: -29 } : undefined}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" padding={{ left: 0, right: 0 }} />
              <YAxis
                yAxisId="left"
                domain={[0, 1]}
                label={
                  !isMobile ?
                    {
                      value: "Number of Posts",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      style: { textAnchor: "middle", fill: "#666", fontSize: 13 },
                    }
                    :
                    undefined}
                tick={{ fontSize: 13 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={
                  !isMobile ?
                    {
                      value: "Impressions, Likes and Comments",
                      angle: 90,
                      position: "insideRight",
                      offset: 10,
                      style: { textAnchor: "middle", fill: "#666", fontSize: 13 },
                    }
                    :
                    undefined}
                tick={{ fontSize: 13 }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{
                  paddingTop: 8,
                  // whiteSpace: "pre-wrap",
                  // textAlign: "center",
                  // width: "100%",
                  // overflow: "hidden",
                }}
                formatter={(value) => {
                  const labelMap: Record<string, string> = {
                    totalImpressions: "Impressions",
                    totalLikes: "Likes",
                    totalComments: "Comments",
                    totalPosts: "Posts",
                  };
                  return labelMap[value] || value;
                }}
              />

              <Bar
                yAxisId="left"
                dataKey="totalImpressions"
                maxBarSize={isMobile ? 20 : 40}
                fill="#4285F4"
                radius={[4, 4, 0, 0]}
              />

              {/* Line for Likes */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalLikes"
                stroke="#FF4500"
                strokeWidth={2}
                dot={{ fill: "#FF4500", stroke: "#fff", r: 4 }}
              />

              {/* Line for Comments */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalComments"
                stroke="#FFA500"
                strokeWidth={2}
                dot={{ fill: "#FFA500", stroke: "#fff", r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>

        </CardContent>
      </Card>
    </div>
  )
}



export const ViewAnalyticsSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="w-full grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 border-2 border-secondary rounded-xl py-2 md:py-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className={`flex gap-2 px-4 my-2 ${idx !== 4 ? "border-r-2 border-secondary" : ""}`}
          >
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
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
    </div>
  );
}


export default ViewAnalytics;