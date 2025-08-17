import { useSession } from '@/backend-apis/auth/hooks'
import { useGetFacebookMetrics, useGetLinkedinMetrics } from '@/backend-apis/metrics/hooks'
import React, { useEffect, useState } from 'react'
import ViewAnalytics, { ViewAnalyticsSkeleton } from './view-analytics'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getOauthPages } from '@/server-actions/check-project-oauth-provider'
import axios from 'axios'
import { toast } from 'sonner'

const Linkedin = () => {
  const { data } = useSession();
  const [availableProviders, setAvailableProviders] = React.useState<Array<{ id: string; pageName?: string | null; pageId?: string | null }> | undefined>()
  const [executed, setExecuted] = useState(false);
  const [selectedPage, setSelectedPage] = useState<undefined | string>();
  const { data: linkedin, isLoading, error } = useGetLinkedinMetrics(selectedPage || "");

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

  if (isLoading) return <ViewAnalyticsSkeleton />

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
        totalPosts={linkedin?.data?.length || 0}
        totalComments={linkedin?.data?.reduce((sum, data) => sum + (data.comments || 0), 0) || 0}
        totalLikes={linkedin?.data?.reduce((sum, data) => sum + (data.likes || 0), 0) || 0}
        totalFollowers={linkedin?.followersCount || 0}
        totalImpressions={linkedin?.data?.reduce((sum, data) => sum + (data.impressions || 0), 0) || 0}
        chartData={linkedin?.data ?
          [...linkedin.data].reverse().map((data) => ({
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

export { Linkedin }

