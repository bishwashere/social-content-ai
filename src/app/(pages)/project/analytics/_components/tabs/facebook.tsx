import { useSession } from '@/backend-apis/auth/hooks'
import { useGetFacebookMetrics } from '@/backend-apis/metrics/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Heart, MessageCircle, Users } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import ViewAnalytics, { ViewAnalyticsSkeleton } from './view-analytics'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getOauthPages } from '@/server-actions/check-project-oauth-provider'

const chartData = [
  { day: "Sun", totalPosts: 0, totalImpressions: 0, totalLikes: 0, totalComments: 0 },
  { day: "Mon", totalPosts: 0, totalImpressions: 0, totalLikes: 1, totalComments: 0 },
  { day: "Tue", totalPosts: 1, totalImpressions: 10, totalLikes: 2, totalComments: 1 },
  { day: "Wed", totalPosts: 0, totalImpressions: 8, totalLikes: 3, totalComments: 2 },
  { day: "Thu", totalPosts: 1, totalImpressions: 40, totalLikes: 3, totalComments: 2 },
  { day: "Fri", totalPosts: 1, totalImpressions: 10, totalLikes: 1, totalComments: 0 },
  { day: "Sat", totalPosts: 0, totalImpressions: 5, totalLikes: 0, totalComments: 0 },
];

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
    setSelectedPage(result[0].pageId || "");
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
        chartData={chartData}
      />
    </div>
    // <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-4">
    //   {
    //     fb.data?.data?.map((post, i) => {
    //       return (
    //         <Card className="w-full max-w-2xl" key={i}>
    //           <CardContent className="space-y-4">
    //             <div className="text-sm leading-relaxed">{post.message?.substring(0, 40) + "..." || "No message content"}</div>

    //             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t">
    //               <div className="flex items-center gap-2">
    //                 <Heart className="h-4 w-4 text-red-500" />
    //                 <div className="text-sm">
    //                   <div className="font-medium">{post.reactions?.toLocaleString() || 0}</div>
    //                   <div className="text-muted-foreground text-xs">Reactions</div>
    //                 </div>
    //               </div>

    //               <div className="flex items-center gap-2">
    //                 <MessageCircle className="h-4 w-4 text-blue-500" />
    //                 <div className="text-sm">
    //                   <div className="font-medium">{post.comments?.toLocaleString() || 0}</div>
    //                   <div className="text-muted-foreground text-xs">Comments</div>
    //                 </div>
    //               </div>

    //               <div className="flex items-center gap-2">
    //                 <Eye className="h-4 w-4 text-green-500" />
    //                 <div className="text-sm">
    //                   <div className="font-medium">{post.impressions?.toLocaleString() || 0}</div>
    //                   <div className="text-muted-foreground text-xs">Impressions</div>
    //                 </div>
    //               </div>

    //               <div className="flex items-center gap-2">
    //                 <Users className="h-4 w-4 text-purple-500" />
    //                 <div className="text-sm">
    //                   <div className="font-medium">{post.uniqueImpressions?.toLocaleString() || 0}</div>
    //                   <div className="text-muted-foreground text-xs">Unique Impressions</div>
    //                 </div>
    //               </div>
    //             </div>
    //           </CardContent>
    //         </Card>
    //       )
    //     })
    //   }
    // </div>
  )
}

export { Facebook }

