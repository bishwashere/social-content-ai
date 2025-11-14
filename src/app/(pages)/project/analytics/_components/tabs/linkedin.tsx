import { useSession } from '@/backend-apis/auth/hooks'
import { useGetLinkedinMetrics } from '@/backend-apis/metrics/hooks'
import React, { useEffect, useState } from 'react'
import ViewAnalytics, { ViewAnalyticsProps, ViewAnalyticsSkeleton } from './view-analytics'
import { toast } from 'sonner'
import { AnalyticsPlatformsProps } from '.'

const Linkedin = ({ timerange, selectedProject }: AnalyticsPlatformsProps) => {
  const { data: session } = useSession();
  const { data: linkedin, isLoading, error } = useGetLinkedinMetrics(session?.user.id || "", selectedProject);
  const [analytics, setAnalytics] = useState<ViewAnalyticsProps>({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Something went wrong");
    }
  }, [error])

  useEffect(() => {
    if (linkedin?.data && Array.isArray(linkedin.data) && timerange) {
      try {
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - timerange);

        const filteredData = linkedin.data.filter((item) => {
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
          totalFollowers: linkedin.followersCount || 0,
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
        console.error("Error processing LinkedIn analytics data:", error);
        // Keep default analytics state on error
      }
    } else if (!selectedProject) {
      // Reset to default if no project selected
      setAnalytics({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });
    }
  }, [linkedin, timerange, selectedProject]);

  if (isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      <ViewAnalytics {...analytics} />
    </div>
  )
}

export { Linkedin }

