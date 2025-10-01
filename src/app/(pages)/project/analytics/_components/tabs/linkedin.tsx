import { useSession } from '@/backend-apis/auth/hooks'
import { useGetFacebookMetrics, useGetLinkedinMetrics } from '@/backend-apis/metrics/hooks'
import React, { useEffect, useState } from 'react'
import ViewAnalytics, { ViewAnalyticsProps, ViewAnalyticsSkeleton } from './view-analytics'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getOauthPages } from '@/server-actions/check-project-oauth-provider'
import axios from 'axios'
import { toast } from 'sonner'
import { timeRangeOptions } from './all'

const Linkedin = () => {
  const { data } = useSession();
  const [availableProviders, setAvailableProviders] = React.useState<Array<{ id: string; pageName?: string | null; pageId?: string | null }> | undefined>()
  const [executed, setExecuted] = useState(false);
  const [selectedPage, setSelectedPage] = useState<undefined | string>();
  const { data: linkedin, isLoading, error } = useGetLinkedinMetrics(selectedPage || "");
  const [timerange, setTimerange] = useState<number>(timeRangeOptions[0].value);
  const [analytics, setAnalytics] = useState<ViewAnalyticsProps>({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });

  const fetchLinkedinPages = async () => {
    if (!data?.user.id || executed) return;
    const result = await getOauthPages(data.user.id, "linkedin");
    setAvailableProviders(result);
    setSelectedPage(result?.[0].pageId || "");
    setExecuted(true);
  }

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Something went wrong");
    }
  }, [error])

  useEffect(() => {
    fetchLinkedinPages();
  }, [data?.user.id])

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
          label: d.content?.substring(0, 20) + "...",
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
      {availableProviders?.length &&
        <div className='flex justify-end gap-4 items-center mb-2'>
          <div className='flex gap-2 items-center'>
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
          <div className='flex gap-2 items-center'>
            <p className='text-sm'>Page:</p>
            <Select value={selectedPage} onValueChange={(value) => setSelectedPage(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {availableProviders?.map((provider) => (
                  <SelectItem key={provider.pageId} value={provider.pageId || ""}>
                    {provider.pageName || provider.pageId || 'Unnamed Account'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      }
      <ViewAnalytics {...analytics} />
    </div>
  )
}

export { Linkedin }

