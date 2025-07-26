import { useQueryUploadedVideoUrl } from '@/backend-apis/video-generation/hooks'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { Loader2, VideoIcon } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

type Props = {
  projectId: string
  campaign: {
    id: string
  }
  timeline: {
    day: number
  }
}

const CampaignVideoButton = ({
  projectId,
  campaign,
  timeline,
}: Props) => {
  const { data, isLoading } = useQueryUploadedVideoUrl(projectId, campaign.id, timeline.day.toString())

  if (isLoading) {
    return <Loader2 className='size-4 animate-spin' />
  }

  if (!data || data === "no-data") {
    return (
      <Link
        href={`/project/${projectId}/video/?campaignId=${campaign.id}&day=${timeline.day}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-dashed border-primary")}>
        <VideoIcon />
      </Link>
    )
  }

  if (data === "pending") return null;

  return (
    <Link
      href={data}
      target="_blank"
      className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "bg-gray-200")}>
      <VideoIcon />
    </Link>
  )
}

export { CampaignVideoButton }