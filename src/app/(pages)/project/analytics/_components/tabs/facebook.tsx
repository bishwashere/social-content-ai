import { useSession } from '@/backend-apis/auth/hooks'
import { useGetFacebookMetrics } from '@/backend-apis/metrics/hooks'
import React, { useEffect, useState } from 'react'
import ViewAnalytics, { ViewAnalyticsSkeleton } from './view-analytics'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getOauthPages } from '@/server-actions/check-project-oauth-provider'



const Facebook = () => {
  const { data } = useSession();
  const [availableProviders, setAvailableProviders] = React.useState<Array<{ id: string; pageName?: string | null; pageId?: string | null }> | undefined>()
  const [executed, setExecuted] = useState(false);
  const [selectedPage, setSelectedPage] = useState<undefined | string>();
  const fb = useGetFacebookMetrics(selectedPage || "");

  const fetchFacebookPages = async () => {
    if (!data?.user.id || executed) return;
    const result = await getOauthPages(data.user.id, "facebook");
    setAvailableProviders(result);
    setSelectedPage(result?.[0].pageId || "");
    setExecuted(true);
  }

  useEffect(() => {
    fetchFacebookPages();
  }, [data?.user.id])

  if (fb.isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      {availableProviders?.length &&
        <div className='flex justify-end gap-2 items-center mb-2'>
          <p className='text-sm'>Select Page:</p>
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
      }
      <ViewAnalytics
        totalPosts={fb.data?.data?.length || 0}
        totalComments={fb.data?.data?.reduce((sum, data) => sum + (data.comments || 0), 0) || 0}
        totalLikes={fb.data?.data?.reduce((sum, data) => sum + (data.reactions || 0), 0) || 0}
        totalFollowers={0}
        totalImpressions={fb.data?.data?.reduce((sum, data) => sum + (data.impressions || 0), 0) || 0}
        chartData={fb.data?.data?.map((data) => ({
          label: data.message?.substring(0, 20) + "...",
          totalComments: data.comments || 0,
          totalImpressions: data.impressions || 0,
          totalLikes: data.reactions || 0,
        })) || []}
      />
    </div>
  )
}

export { Facebook }

