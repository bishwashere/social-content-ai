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
    if (linkedin?.data && timerange) {
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - timerange);

      const filteredData = linkedin.data.filter((item) => {
        const postDate = new Date(item.date);
        return postDate >= cutoffDate;
      });

      setAnalytics({
        totalPosts: filteredData.length,
        totalComments: filteredData.reduce((sum, d) => sum + (d.comments || 0), 0),
        totalLikes: filteredData.reduce((sum, d) => sum + (d.likes || 0), 0),
        totalFollowers: linkedin.followersCount,
        totalImpressions: filteredData.reduce((sum, d) => sum + (d.impressions || 0), 0),
        chartData: filteredData.map((d) => ({
          label: d.date.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
          }),
          totalComments: d.comments || 0,
          totalImpressions: d.impressions || 0,
          totalLikes: d.likes || 0,
        })),
      });
    }
  }, [linkedin, timerange]);

  if (isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      <ViewAnalytics {...analytics} />
    </div>
  )
}

export { Linkedin }

