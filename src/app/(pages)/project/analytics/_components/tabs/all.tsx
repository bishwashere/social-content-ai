import { useSession } from '@/backend-apis/auth/hooks'
import { useGetAllPlatformMetrics } from '@/backend-apis/metrics/hooks'
import ViewAnalytics, { ViewAnalyticsProps, ViewAnalyticsSkeleton } from './view-analytics'
import { useEffect, useState } from 'react';
import { AnalyticsPlatformsProps } from '.';

const All = ({ timerange, selectedProject }: AnalyticsPlatformsProps) => {
  const { data: session } = useSession();
  const { isLoading, data, error } = useGetAllPlatformMetrics(session?.user.id || "", selectedProject);
  const [analytics, setAnalytics] = useState<ViewAnalyticsProps>({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });

  useEffect(() => {
    // Check for errors first
    if (error) {
      console.error("[All Analytics] Error:", error);
      return;
    }

    // Check if request was unsuccessful
    if (data && 'success' in data && data.success === false) {
      console.error("[All Analytics] API returned error:", data.message);
      return;
    }

    if (data?.data && Array.isArray(data.data) && timerange) {
      try {
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - timerange);

        const filteredData = data.data.filter((item) => {
          if (!item || !item.date) return false;
          try {
            const postDate = item.date instanceof Date ? item.date : new Date(item.date);
            return !isNaN(postDate.getTime()) && postDate >= cutoffDate;
          } catch {
            return false;
          }
        });

        setAnalytics({
          totalPosts: filteredData.length,
          totalComments: filteredData.reduce((sum, d) => sum + (d.comments || 0), 0),
          totalLikes: filteredData.reduce((sum, d) => sum + (d.likes || 0), 0),
          totalFollowers: 0,
          totalImpressions: filteredData.reduce((sum, d) => sum + (d.impressions || 0), 0),
          chartData: filteredData.map((d) => {
            try {
              const date = d.date instanceof Date ? d.date : new Date(d.date);
              return {
                label: !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: '2-digit',
                  year: 'numeric'
                }) : 'Invalid Date',
                totalComments: d.comments || 0,
                totalImpressions: d.impressions || 0,
                totalLikes: d.likes || 0,
              };
            } catch {
              return {
                label: 'Invalid Date',
                totalComments: d.comments || 0,
                totalImpressions: d.impressions || 0,
                totalLikes: d.likes || 0,
              };
            }
          }),
        });
      } catch (error) {
        console.error("Error processing analytics data:", error);
        // Keep default analytics state on error
      }
    } else if (!selectedProject) {
      // Reset to default if no project selected
      setAnalytics({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });
    }
  }, [data, timerange, selectedProject]);

  if (isLoading) return <ViewAnalyticsSkeleton />

  // Show error message if there's an error
  if (error) {
    return (
      <div className='w-full p-4'>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error loading analytics</p>
          <p className="text-red-600 text-sm mt-1">{error.message || "An unexpected error occurred"}</p>
        </div>
      </div>
    );
  }

  // Show message if API returned an error
  if (data && 'success' in data && data.success === false) {
    return (
      <div className='w-full p-4'>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">No analytics data available</p>
          <p className="text-yellow-600 text-sm mt-1">{data.message || "Please connect and link social media accounts to this project"}</p>
        </div>
      </div>
    );
  }

  // Show message if no project selected
  if (!selectedProject) {
    return (
      <div className='w-full p-4'>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">Select a project</p>
          <p className="text-blue-600 text-sm mt-1">Please select a project from above to view analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full'>
      <ViewAnalytics {...analytics} />
    </div>
  )
}

export { All }

