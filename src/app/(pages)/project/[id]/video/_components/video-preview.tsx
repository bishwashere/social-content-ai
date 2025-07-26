"use client"

import { useEffect, useRef, useState } from "react"
import { Play, Pause, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

interface VideoPreviewProps {
  videos: string[]
  overlayText?: string
  autoPlay?: boolean
  muted?: boolean
}

export default function VideoPreview({ videos, overlayText, autoPlay = true, muted = true }: VideoPreviewProps) {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  const preloadVideoRef = useRef<HTMLVideoElement>(null)

  // Handle video end event to play the next video or loop back to the first
  const handleVideoEnd = () => {
    if (currentVideoIndex < videos.length - 1) {
      // Play the next video
      setCurrentVideoIndex(currentVideoIndex + 1)
    } else {
      // Loop back to the first video when the last video finishes
      setCurrentVideoIndex(0)
    }
  }

  // Play/Pause toggle handler
  const togglePlayPause = () => {
    const videoElement = videoRef.current
    if (!videoElement || isLoading) return

    if (isPlaying) {
      videoElement.pause()
    } else {
      // We don't await this because we'll rely on the 'play' event to update state
      videoElement.play().catch((error) => {
        console.error("Video playback control failed:", error)
      })
    }
  }

  // Restart current video handler
  const handleRestart = () => {
    const videoElement = videoRef.current
    if (!videoElement || isLoading) return

    setCurrentVideoIndex(0)
    videoElement.currentTime = 0
    if (!isPlaying) {
      videoElement.play().catch((error) => {
        console.error("Video restart failed:", error)
      })
    }
  }

  // Set up video source and event listeners
  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    // Set loading state
    setIsLoading(true)

    // Set the video source
    videoElement.src = videos[currentVideoIndex]

    // Event handlers
    const handleCanPlay = () => {
      setIsLoading(false)
      if (autoPlay) {
        videoElement.play().catch((error) => {
          console.error("Auto-play failed:", error)
        })
      }
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    // Add event listeners
    videoElement.addEventListener("canplay", handleCanPlay)
    videoElement.addEventListener("play", handlePlay)
    videoElement.addEventListener("pause", handlePause)

    // Clean up
    return () => {
      videoElement.removeEventListener("canplay", handleCanPlay)
      videoElement.removeEventListener("play", handlePlay)
      videoElement.removeEventListener("pause", handlePause)
    }
  }, [currentVideoIndex, videos, autoPlay])

  // Preload the next video
  useEffect(() => {
    // Determine the next video index, looping back to 0 if at the end
    const nextVideoIndex = (currentVideoIndex + 1) % videos.length

    if (preloadVideoRef.current && !isLoading) {
      // Only preload after current video is ready
      const preloadElement = preloadVideoRef.current
      preloadElement.src = videos[nextVideoIndex]
    }
  }, [currentVideoIndex, videos, isLoading])

  // Calculate responsive font size based on container width
  const [fontSize, setFontSize] = useState(36)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!overlayText || !containerRef.current) return

    const calculateFontSize = () => {
      const containerWidth = containerRef.current?.clientWidth || 0
      let newFontSize = 36 // max font size

      // Reduce font size until it fits
      while (newFontSize > 12 && overlayText.length * newFontSize * 0.6 > containerWidth - 40) {
        newFontSize -= 4
      }

      setFontSize(newFontSize)
    }

    calculateFontSize()
    window.addEventListener("resize", calculateFontSize)

    return () => {
      window.removeEventListener("resize", calculateFontSize)
    }
  }, [overlayText])

  if (!videos || videos.length === 0) {
    return <div className="text-center p-4">No videos available</div>
  }

  return (
    <div
      ref={containerRef} className="relative w-full max-w-full overflow-hidden rounded-lg aspect-[17/30] group">
      <video
        ref={videoRef}
        className="w-full h-full object-cover object-center bg-muted rounded-md border border-muted-foreground"
        onEnded={handleVideoEnd}
        muted={muted}
        preload="auto"
      />

      {/* Hidden video element to preload the next video */}
      <video ref={preloadVideoRef} className="hidden" preload="auto" muted />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Custom video controls */}
      <div className="absolute inset-0 flex items-center justify-center gap-4">
        <Button
          onClick={togglePlayPause}
          size={"icon"}
          disabled={isLoading}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={cn("rounded-full scale-0 group-hover:scale-100 transition-all")}
        >
          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
        </Button>

        <Button
          onClick={handleRestart}
          variant={"secondary"}
          size={"icon"}
          disabled={isLoading}
          aria-label="Restart"
          className={cn("rounded-full scale-0 group-hover:scale-100 transition-all")}

        >
          <RefreshCw className="w-8 h-8" />
        </Button>
      </div>

      {overlayText && currentVideoIndex === 0 && (
        <div className="absolute top-6 left-0 right-0 p-2 px-6 flex justify-center">
          <p
            className="text-white text-center font-bold break-words max-w-full"
            style={{
              fontSize: `${fontSize}px`,
              textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
              strokeWidth: "1px",
              stroke: "black",
            }}
          >
            {overlayText}
          </p>
        </div>
      )}
    </div>
  )
}

