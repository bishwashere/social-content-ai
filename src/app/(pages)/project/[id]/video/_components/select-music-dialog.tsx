"use client"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, MusicIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { useListAllViralMusics } from "@/backend-apis/video-generation/hooks"

type Media = NonNullable<ReturnType<typeof useListAllViralMusics>["data"]>[number]

interface MediaSelectionDialogProps {
  onSelect: (media: Media) => void
}

export function MediaSelectionDialog({ onSelect }: MediaSelectionDialogProps) {
  const media = useListAllViralMusics()
  const [open, setOpen] = useState(false)
  // const [durationDialogOpen, setDurationDialogOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  // const [startTime, setStartTime] = useState(0)
  const [selectedMediaName, setSelectedMediaName] = useState("Select a music")
  const [mediaDuration, setMediaDuration] = useState(0)

  const mediaRef = useRef<HTMLAudioElement | null>(null)
  const animationRef = useRef<number | null>(null)

  // Create media element when selected media changes
  useEffect(() => {
    if (selectedMedia) {
      if (mediaRef.current) {
        mediaRef.current.pause()
        mediaRef.current.removeEventListener("loadedmetadata", () => { })
        mediaRef.current.removeEventListener("error", () => { })
      }

      try {
        mediaRef.current = new Audio(selectedMedia.url)

        // Add error handling
        mediaRef.current.addEventListener("error", (e) => {
          console.warn(`Error loading media: ${selectedMedia.url}`, e)
          setIsPlaying(false)
          // Set a default duration for mock functionality
          setMediaDuration(180) // Default 3 minutes
        })

        mediaRef.current.addEventListener("loadedmetadata", () => {
          setIsPlaying(false)
          setCurrentTime(0)
          // Get actual duration if available
          if (mediaRef.current) {
            setMediaDuration(mediaRef.current.duration || 180)
          }
        })
      } catch (error) {
        console.warn(`Error creating media element: ${error}`)
        mediaRef.current = null
        // Set a default duration for mock functionality
        setMediaDuration(180) // Default 3 minutes
      }

      return () => {
        if (mediaRef.current) {
          mediaRef.current.pause()
          mediaRef.current.removeEventListener("loadedmetadata", () => { })
          mediaRef.current.removeEventListener("error", () => { })
          mediaRef.current = null
        }
        cancelAnimationFrame(animationRef.current!)
      }
    }
  }, [selectedMedia])

  // Handle play/pause
  const togglePlayPause = () => {
    if (!mediaRef.current) {
      // Mock playback when media can't be loaded
      setIsPlaying(!isPlaying)
      if (!isPlaying) {
        // Start mock progress updates
        let mockTime = currentTime
        const updateMockProgress = () => {
          mockTime += 0.1
          if (mockTime >= mediaDuration) {
            mockTime = 0
            setIsPlaying(false)
          } else if (isPlaying) {
            setCurrentTime(mockTime)
            animationRef.current = requestAnimationFrame(updateMockProgress)
          }
        }
        animationRef.current = requestAnimationFrame(updateMockProgress)
      } else {
        cancelAnimationFrame(animationRef.current!)
      }
      return
    }

    try {
      if (isPlaying) {
        mediaRef.current.pause()
        cancelAnimationFrame(animationRef.current!)
      } else {
        const playPromise = mediaRef.current.play()

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              animationRef.current = requestAnimationFrame(updateProgress)
            })
            .catch((error) => {
              console.warn("Playback failed:", error)
              // Fall back to mock playback
              setIsPlaying(true)
              let mockTime = currentTime
              const updateMockProgress = () => {
                mockTime += 0.1
                if (mockTime >= mediaDuration) {
                  mockTime = 0
                  setIsPlaying(false)
                } else if (isPlaying) {
                  setCurrentTime(mockTime)
                  animationRef.current = requestAnimationFrame(updateMockProgress)
                }
              }
              animationRef.current = requestAnimationFrame(updateMockProgress)
            })
        }
      }

      setIsPlaying(!isPlaying)
    } catch (error) {
      console.warn("Error during playback:", error)
      // Fall back to mock mode
      setIsPlaying(!isPlaying)
    }
  }

  // Update progress bar
  const updateProgress = () => {
    if (!mediaRef.current) return

    setCurrentTime(mediaRef.current.currentTime)
    animationRef.current = requestAnimationFrame(updateProgress)
  }

  // Handle slider change
  const handleSliderChange = (value: number[]) => {
    const newTime = value[0]

    if (mediaRef.current) {
      try {
        mediaRef.current.currentTime = newTime
      } catch (error) {
        console.warn("Error setting media time:", error)
      }
    }

    setCurrentTime(newTime)
  }

  // // Handle duration slider change
  // const handleDurationSliderChange = (value: number[]) => {
  //   setStartTime(value[0])
  // }

  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  }

  // // Handle final selection
  // const handleFinalSelection = () => {
  //   if (selectedMedia) {
  //     setSelectedMediaName(selectedMedia.name)
  //     onSelect(selectedMedia, startTime)
  //     setDurationDialogOpen(false)
  //     setOpen(false)
  //   }
  // }

  // Handle media selection
  const handleMediaSelection = (media: Media) => {
    setSelectedMedia(media)
  }

  // // Open duration dialog
  // const openDurationDialog = () => {
  //   if (selectedMedia) {
  //     setStartTime(0)
  //     setDurationDialogOpen(true)
  //   }
  // }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full flex items-center">{selectedMediaName} <MusicIcon /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Select Media</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <div className="md:col-span-1 border rounded-md">
            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-2">
                {
                  media.isLoading ? Array.from({ length: 6 }, (_, i) => (
                    <Skeleton className="h-10 w-full" key={i} />
                  )) :
                    media.data?.map((media) => (
                      <div
                        key={media.key}
                        className={`p-3 rounded-md cursor-pointer transition-colors ${selectedMedia?.key === media.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                          }`}
                        onClick={() => handleMediaSelection(media)}
                      >
                        <div className="font-medium">{media.name}</div>
                      </div>
                    ))}
              </div>
            </ScrollArea>
          </div>
          <div className="md:col-span-2 flex flex-col justify-between">
            {selectedMedia ? (
              <>
                <div className="space-y-6 p-4">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">{selectedMedia.name}</h3>
                  </div>

                  <div className="flex items-center justify-center h-40 bg-muted rounded-md overflow-hidden">
                    {/* Placeholder for waveform visualization */}
                    <div className="w-full h-full px-4 flex items-center">
                      <div className="w-full h-20 flex items-end justify-center space-x-1">
                        {Array.from({ length: 50 }).map((_, i) => (
                          <div
                            key={i}
                            className="bg-primary/60 w-1.5 rounded-t-sm"
                            style={{
                              height: `${Math.min(80, Math.max(15, Math.sin(i * 0.2) * 40 + Math.random() * 15))}px`,
                              opacity: mediaDuration > 0 ? (currentTime / mediaDuration > i / 50 ? 1 : 0.4) : 0.4,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{mediaDuration ? formatTime(currentTime) : "Loading..."}</span>
                      <span>{mediaDuration ? formatTime(mediaDuration) : "Loading..."}</span>
                    </div>
                    <Slider value={[currentTime]} max={mediaDuration} step={0.1} onValueChange={handleSliderChange} />
                  </div>
                </div>

                <div className="flex justify-center p-4">
                  <Button variant="outline" size="icon" className="rounded-full h-12 w-12" onClick={togglePlayPause}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a media from the list</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            onSelect(selectedMedia!)
            setOpen(false)
            setSelectedMediaName(selectedMedia?.name || "Select a music")
            setSelectedMedia(null)

          }} disabled={!selectedMedia}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Duration Selection Dialog !not need now */}
      {/* <Dialog open={durationDialogOpen} onOpenChange={setDurationDialogOpen}>
        <DialogContent className="sm:max-w-fit">
          <DialogHeader>
            <DialogTitle>Select Start Duration</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-center h-32 bg-muted rounded-md overflow-hidden">
              <div className="w-full h-full px-4 flex items-center">
                <div className="w-full h-20 flex items-end justify-center space-x-1">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-primary/60 w-1.5 rounded-t-sm"
                      style={{
                        height: `${Math.min(60, Math.max(15, Math.sin(i * 0.2) * 30 + Math.random() * 15))}px`,
                        opacity: mediaDuration > 0 ? (startTime / mediaDuration > i / 50 ? 1 : 0.4) : 0.4,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{formatTime(startTime)}</span>
                <span>{formatTime(mediaDuration)}</span>
              </div>
              <Slider value={[startTime]} max={mediaDuration} step={0.1} onValueChange={handleDurationSliderChange} />
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">Drag the slider to select the start time of the media</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleFinalSelection}>
              <Check className="mr-2 h-4 w-4" /> Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog> */}
    </Dialog>
  )
}

