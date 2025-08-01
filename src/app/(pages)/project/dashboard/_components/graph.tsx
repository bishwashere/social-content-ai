"use client"
import { useGetTrackedProjects } from '@/backend-apis/projects/hooks'

import { Loader2, TrendingUp } from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { useFacebookPostMetrics, useRedditPostsData } from '@/backend-apis/metrics/hooks'
import { useEffect, useState } from 'react'
import { useSession } from '@/backend-apis/auth/hooks'


const chartConfig = {
  upvotes: {
    label: "Upvotes",
    color: "hsl(var(--chart-1))",
  },
  comments: {
    label: "Comments",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig



type Props = {
  platform: string
  projectId: string
}

const Graph = ({ platform, projectId }: Props) => {
  const { data: session } = useSession()
  const activity = useGetTrackedProjects({ projectId: projectId });
  const [postsData, setPostsData] = useState<{
    id: string
    metrics: {
      upvotes: number
      comments: number
    }
  }[]>([])
  const fb = useFacebookPostMetrics({
    urls: activity.data?.
      filter((item) => item.platform === "facebook")?.
      map((item) => item.url)?.filter((item) => item !== null) as string[] || [],
    userId: session?.user?.id || ""
  })
  const reddit = useRedditPostsData(activity.data?.
    filter((item) => item.platform === "reddit")?.
    map((item) => item.url)?.filter((item) => item !== null) as string[] || [])

  useEffect(() => {
    // set post data according to platform
    if (platform === "facebook") {
      setPostsData(fb.data?.map((item) => ({
        id: item.date,
        metrics: {
          upvotes: item.likeCount || 0,
          comments: item.commentCount || 0,
        }
      })) || [])
    } else if (platform === "reddit") {
      setPostsData(reddit.data?.map((item) => ({
        id: item.date,
        metrics: {
          upvotes: item.upvotes || 0,
          comments: item.comments || 0,
        }
      })) || [])
    }
  }, [fb.data, reddit.data])

  if (!projectId && !platform) return null
  return (
    <Card>
      <CardContent>
        {
          fb.isLoading || reddit.isLoading ? (
            <div className='flex flex-col items-center py-12 justify-center'>
              <Loader2 className='h-10 w-10 animate-spin' />
            </div>
          ) :

            (postsData?.length || 0) === 0 ? (
              <div className='flex flex-col items-center py-12 justify-center'>
                <p className='text-muted-foreground'>
                  No data available
                </p>
              </div>
            ) :
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={postsData}
                  margin={{
                    left: 12,
                    right: 12,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="title"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 10) + "..."}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="comments"
                    type="natural"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.4}
                    stroke="hsl(var(--chart-1))"
                    stackId="a"
                  />
                  <Area
                    dataKey="upvotes"
                    type="natural"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.4}
                    stroke="hsl(var(--chart-2))"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>}
      </CardContent>
    </Card>
  )
}

export { Graph }

