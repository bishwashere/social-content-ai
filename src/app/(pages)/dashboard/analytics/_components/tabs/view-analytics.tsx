"use client";

import { AnalyticsStatCards, AnalyticsStatCardsSkeleton } from "./analytics-stat-cards";
import { AnalyticsChart, AnalyticsChartSkeleton } from "./analytics-chart";

export type ViewAnalyticsProps = {
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
    totalPosts: number;
  }[];
};

/**
 * Main analytics view component that displays stat cards and performance chart
 */
const ViewAnalytics = ({
  totalPosts,
  totalLikes,
  totalFollowers,
  totalImpressions,
  totalComments,
  chartData,
}: ViewAnalyticsProps) => {
  return (
    <div>
      <AnalyticsStatCards
        totalPosts={totalPosts}
        totalLikes={totalLikes}
        totalFollowers={totalFollowers}
        totalImpressions={totalImpressions}
        totalComments={totalComments}
      />
      <AnalyticsChart chartData={chartData} />
    </div>
  );
};

/**
 * Skeleton loader for analytics view
 */
export const ViewAnalyticsSkeleton = () => {
  return (
    <div className="space-y-8">
      <AnalyticsStatCardsSkeleton />
      <AnalyticsChartSkeleton />
    </div>
  );
};

export default ViewAnalytics;
