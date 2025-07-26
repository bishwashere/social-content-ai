"use client"

import type React from "react"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { useQueryAllUploadedMedia } from "@/backend-apis/video-generation/hooks"
import { useParams } from "next/navigation"

type Props = {
  onSelect: (video: File | { videoId: string, url: string }) => void
}

export default function SelectVideoDialog({ onSelect }: Props) {
  const { id } = useParams()
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string,
    url: string
  } | null>(null)

  const vids = useQueryAllUploadedMedia(id as string)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Select Video File</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Select or Upload Video</DialogTitle>
          <DialogDescription>
            Choose from your existing videos or upload a new one from your computer.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
          {
            vids?.isLoading ? Array.from({ length: 6 }, (_, i) => (
              <Skeleton className="h-48 w-full" key={i} />
            )) :
              vids?.data?.map((video) => (
                <div
                  key={video.key}
                  className={cn(`relative rounded-lg border max-h-72 overflow-hidden cursor-pointer transition-all `, selectedVideo?.videoId === video.key ? "ring-2 ring-primary" : "hover:bg-accent"
                  )}
                  onClick={() => {
                    setSelectedVideo({ videoId: video.key, url: video.url })
                  }}
                >
                  <div className="relative">
                    <video
                      src={video.url}
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                      className="object-cover object-center"
                      muted
                    />
                  </div>
                  <div className="p-2 absolute bottom-0 bg-muted left-0 w-full">
                    <h3 className="font-medium text-sm line-clamp-1 truncate">{video.name}</h3>
                  </div>
                </div>
              ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button disabled={!selectedVideo} onClick={() => onSelect(selectedVideo!)}>Select</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

