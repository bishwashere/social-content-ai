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
import { useRedditPostsData } from '@/backend-apis/metrics/hooks'
import { useEffect } from 'react'


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
  const activity = useGetTrackedProjects({ projectId: projectId });

  const { data: postsData, isLoading } = useRedditPostsData(activity.data?.
    filter((item) => item.platform === platform)?.
    map((item) => item.url)?.filter((item) => item !== null) as string[] || [])

  if (!projectId && !platform) return null
  return (
    <Card>
      <CardContent>
        {
          isLoading ? (
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

