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
    console.log("[All Analytics] Effect triggered:", {
      isLoading,
      hasData: !!data,
      dataType: data ? typeof data : 'none',
      dataKeys: data ? Object.keys(data) : [],
      dataLength: data?.data ? (Array.isArray(data.data) ? data.data.length : 'not array') : 'no data',
      selectedProject,
      timerange,
      error: error?.message,
      fullData: data, // Log full response to see what we're getting
    });

    // Check for errors first
    if (error) {
      console.error("[All Analytics] Error:", error);
      return;
    }

    // Check if request was unsuccessful
    if (data && 'success' in data && data.success === false) {
      console.error("[All Analytics] API returned error:", data.message);
      console.error("[All Analytics] Full error response:", data);
      setAnalytics({
        totalPosts: 0,
        totalComments: 0,
        totalLikes: 0,
        totalFollowers: 0,
        totalImpressions: 0,
        chartData: [],
      });
      return;
    }

    if (data?.data && Array.isArray(data.data) && timerange) {
      console.log("[All Analytics] Processing data:", {
        totalPosts: data.data.length,
        samplePost: data.data[0],
        timerange,
        fullResponse: data, // Log full API response
      });
      
      if (data.data.length === 0 && data.success === true) {
        console.warn("[All Analytics] ⚠️ API returned success but empty array!");
        console.warn("[All Analytics] This means:");
        console.warn("  1. Either no OAuth providers are linked to this project");
        console.warn("  2. Or providers are linked but have no posts in DB and API fetch failed");
        console.warn("  3. Check server terminal for [getAllPlatformMetrics] logs to see details");
        console.warn("[All Analytics] Full response:", JSON.stringify(data, null, 2));
      }
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

      console.log("[All Analytics] After filtering:", {
        filteredCount: filteredData.length,
        originalCount: data.data.length,
        cutoffDate: cutoffDate.toISOString(),
        now: now.toISOString(),
        timerangeDays: timerange,
        sampleFilteredPost: filteredData[0] ? {
          id: filteredData[0].id,
          date: filteredData[0].date,
          dateType: typeof filteredData[0].date,
        } : null,
        sampleOriginalPost: data.data[0] ? {
          id: data.data[0].id,
          date: data.data[0].date,
          dateType: typeof data.data[0].date,
        } : null,
      });
      
      if (data.data.length > 0 && filteredData.length === 0) {
        console.warn("[All Analytics] ⚠️ All posts were filtered out by date range!");
        console.warn(`[All Analytics] Timerange: ${timerange} days (cutoff: ${cutoffDate.toISOString()})`);
        if (data.data[0]) {
          const firstPostDate = data.data[0].date instanceof Date ? data.data[0].date : new Date(data.data[0].date);
          console.warn(`[All Analytics] First post date: ${firstPostDate.toISOString()}`);
          console.warn(`[All Analytics] Is first post within range? ${firstPostDate >= cutoffDate}`);
        }
      }

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
      console.log("[All Analytics] No project selected");
      // Reset to default if no project selected
      setAnalytics({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });
    } else {
      console.log("[All Analytics] No data or invalid data structure:", {
        hasData: !!data,
        hasDataData: !!data?.data,
        isArray: Array.isArray(data?.data),
        timerange,
        selectedProject,
      });
    }
  }, [data, timerange, selectedProject, error, isLoading]);

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

  // Show message if data is empty (success but no posts)
  if (data && 'success' in data && data.success === true && (!data.data || (Array.isArray(data.data) && data.data.length === 0))) {
    return (
      <div className='w-full p-4'>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">No posts found</p>
          <p className="text-yellow-600 text-sm mt-1">
            This project has linked social media accounts, but no posts have been published yet. 
            Posts will appear here once you publish content through NextPostAI.
          </p>
        </div>
      </div>
    );
  }

  // Show message if analytics are all zeros (likely no data in time range)
  if (analytics.totalPosts === 0 && data && 'success' in data && data.success === true && Array.isArray(data.data) && data.data.length > 0) {
    return (
      <div className='w-full p-4'>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 font-medium">No posts in selected time range</p>
          <p className="text-blue-600 text-sm mt-1">
            This project has {data.data.length} post(s), but none fall within the selected {timerange === 7 ? 'week' : timerange === 30 ? 'month' : timerange === 90 ? '3 months' : timerange === 365 ? 'year' : 'time range'}. 
            Try selecting a longer time range.
          </p>
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

