import { useSession } from '@/backend-apis/auth/hooks'
import { useGetThreadsMetrics } from '@/backend-apis/metrics/hooks'
import ViewAnalytics, { ViewAnalyticsSkeleton } from './view-analytics'



const Threads = () => {
  const { data: session } = useSession();
  const { isLoading, data } = useGetThreadsMetrics(session?.user.id || "");

  if (isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      <ViewAnalytics
        totalPosts={data?.data?.length || 0}
        totalComments={data?.data?.reduce((sum, data) => sum + (data.insights.repliesCount || 0), 0) || 0}
        totalLikes={data?.data?.reduce((sum, data) => sum + (data.insights.likesCount || 0), 0) || 0}
        totalFollowers={0}
        totalImpressions={data?.data?.reduce((sum, data) => sum + (data.insights.viewsCount || 0), 0) || 0}
        chartData={data?.data?.map((data) => ({
          label: data.content?.substring(0, 20) + "...",
          totalComments: data.insights.repliesCount || 0,
          totalImpressions: data.insights.viewsCount || 0,
          totalLikes: data.insights.likesCount || 0,
        })) || []}
      />
    </div>
  )
}

export { Threads }

