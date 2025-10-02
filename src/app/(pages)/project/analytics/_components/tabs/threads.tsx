import { useSession } from '@/backend-apis/auth/hooks'
import { useGetThreadsMetrics } from '@/backend-apis/metrics/hooks'
import ViewAnalytics, { ViewAnalyticsProps, ViewAnalyticsSkeleton } from './view-analytics'
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { timeRangeOptions } from './all';



const Threads = () => {
  const { data: session } = useSession();
  const { isLoading, data } = useGetThreadsMetrics(session?.user.id || "");
  const [timerange, setTimerange] = useState<number>(timeRangeOptions[0].value);
  const [analytics, setAnalytics] = useState<ViewAnalyticsProps>({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });

  useEffect(() => {
    if (data?.data && timerange) {
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - timerange);

      const filteredData = data.data.filter((item) => {
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
          label: new Date(d.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          }),
          totalComments: d.comments || 0,
          totalImpressions: d.impressions || 0,
          totalLikes: d.likes || 0,
        })),
      });
    }
  }, [data, timerange]);

  if (isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      <div className='flex gap-2 items-center justify-end mb-2'>
        <p className='text-sm'>Time Range</p>
        <Select value={String(timerange)} onValueChange={(value) => setTimerange(Number(value))}>
          <SelectTrigger>
            <SelectValue placeholder="Select timerange" />
          </SelectTrigger>
          <SelectContent>
            {timeRangeOptions.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ViewAnalytics {...analytics} />
    </div>
  )
}

export { Threads }

