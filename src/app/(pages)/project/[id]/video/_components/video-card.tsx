import { cn } from '@/lib/cn'
import { CheckIcon, DownloadIcon, Maximize2Icon } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from '@/components/ui/badge';
import { useVideoCache } from '@/hooks/useVideoCache';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  video: {
    src: string
    title: string
    selected: boolean
    status?: string
    download?: string
  }
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const VideoCard = (
  { video, className, ...props }: Props
) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [duration, setDuration] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const { isLoaded, cachedUrl } = useVideoCache(video.src)

  const handleLoadedMetadata = () => {
    if (videoRef.current?.duration) {
      setDuration(formatDuration(videoRef.current.duration))
    }
  }

  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2) {

      if (isHovered) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }, [isHovered])

  return (
    <>
      <div
        className={cn(`cursor-pointer relative transition-all rounded-md  `, video.selected ? "ring-4 ring-primary ring-offset-2" : "hover:scale-105", className)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {video.status && (
          <Badge className="absolute top-2 left-2 z-10"
            variant={video.status === "completed" ? "default" : "destructive"}
          >{video.status}</Badge>
        )}

        <div className="relative rounded-lg overflow-hidden bg-muted">
          {!isLoaded && (
            <div className="absolute inset-0 animate-pulse bg-muted" />
          )}
          <video
            ref={videoRef}
            src={cachedUrl}
            muted={true}
            loop={true}
            className={cn(
              "w-full h-[200px] object-cover",
              !isLoaded && "opacity-0"
            )}
            preload="metadata"
            onLoadedMetadata={handleLoadedMetadata}
          />

          {duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white/80 text-xs px-2 py-1 rounded">
              {duration}
            </div>
          )}
          <div className='absolute top-2 right-2 flex items-center justify-center gap-2'>
            {video.download && <button
              className="bg-muted text-muted-foreground p-1 rounded-full hover:text-foreground cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                window.open(video.download, '_blank')
              }}
            >
              <DownloadIcon className="w-4 h-4" />
            </button>}
            <button
              className="bg-muted text-muted-foreground p-1 rounded-full hover:text-foreground cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                setShowVideoModal(true)
              }}
            >
              <Maximize2Icon className="w-4 h-4" />
            </button>
          </div>

          {video.selected && (
            <div className="absolute top-2 left-2 bg-primary text-primary-foreground p-1 rounded-full">
              <CheckIcon className="w-4 h-4" />
            </div>
          )}
        </div>
        <p className="mt-1 font-medium">{video.title}</p>
      </div>
      <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{video.title}</DialogTitle>
          </DialogHeader>
          <div className="aspect-video">
            <video
              src={video.src}
              controls
              className="w-full h-full"
              autoPlay
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
