import { useSession } from '@/backend-apis/auth/hooks'
import { useGetAllPlatformMetrics, useGetThreadsMetrics } from '@/backend-apis/metrics/hooks'
import ViewAnalytics, { ViewAnalyticsSkeleton } from './view-analytics'



const All = () => {
  const { data: session } = useSession();
  const { isLoading, data } = useGetAllPlatformMetrics(session?.user.id || "");

  if (isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      <ViewAnalytics
        totalPosts={data?.data?.length || 0}
        totalComments={data?.data?.reduce((sum, data) => sum + (data.comments || 0), 0) || 0}
        totalLikes={data?.data?.reduce((sum, data) => sum + (data.likes || 0), 0) || 0}
        totalFollowers={0}
        totalImpressions={data?.data?.reduce((sum, data) => sum + (data.impressions || 0), 0) || 0}
        chartData={data?.data ?
          [...data?.data].reverse().map((data) => ({
            label: new Date(data.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            }),
            totalComments: data.comments || 0,
            totalImpressions: data.impressions || 0,
            totalLikes: data.likes || 0,
          }))
          : []
        }
      />
    </div>
  )
}

export { All }

