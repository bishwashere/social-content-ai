import { useSession } from '@/backend-apis/auth/hooks'
import { useGetFacebookMetrics } from '@/backend-apis/metrics/hooks'
import React, { useEffect, useState } from 'react'
import ViewAnalytics, { ViewAnalyticsProps, ViewAnalyticsSkeleton } from './view-analytics'
import { AnalyticsPlatformsProps } from '.'

const Facebook = ({ timerange, selectedProject }: AnalyticsPlatformsProps) => {

  const { data: session } = useSession();
  const fb = useGetFacebookMetrics(session?.user.id || "", selectedProject);
  const [analytics, setAnalytics] = useState<ViewAnalyticsProps>({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });

  useEffect(() => {
    if (fb.data?.data && timerange) {
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - timerange);

      const filteredData = fb.data.data.filter((item) => {
        const postDate = new Date(item.date);
        return postDate >= cutoffDate;
      });

      setAnalytics({
        totalPosts: filteredData.length,
        totalComments: filteredData.reduce((sum, d) => sum + (d.comments || 0), 0),
        totalLikes: filteredData.reduce((sum, d) => sum + (d.likes || 0), 0),
        totalFollowers: 0,
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
  }, [fb.data, timerange]);


  if (fb.isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      <ViewAnalytics {...analytics} />
    </div>
  )
}

export { Facebook }

