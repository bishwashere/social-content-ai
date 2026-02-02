"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Upload, Check, ChevronRight, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Skeleton } from "@/components/ui/skeleton"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import chunk from "@/lib/chunk"
import { toast } from "sonner"
import { useGenerateVideo, useQueryViralVideos } from "@/backend-apis/video-generation/hooks"
import { VideoCard } from "@/app/(pages)/project/[id]/video/_components/video-card"
import SelectVideoDialog from "@/app/(pages)/project/[id]/video/_components/select-video-dialog"
import { MediaSelectionDialog } from "@/app/(pages)/project/[id]/video/_components/select-music-dialog"
import VideoPreview from "@/app/(pages)/project/[id]/video/_components/video-preview"
import { VideoCreditWarningDialog } from "@/components/common/video-credit-warning-dialog"
import { useSession } from "@/backend-apis/auth/hooks"
import { useQuery } from "@tanstack/react-query"
import { getFirstViewTooltip } from "@/server-actions/first-view-tooltip/actions"
import { cn } from "@/lib/cn"
import { v4 as uuidv4 } from "uuid"


export default function QuickVideoMaker() {
  const [sessionId] = useState(() => uuidv4())
  const [hookText, setHookText] = useState("")
  const [uploadedVideo, setUploadedVideo] = useState<File | string | null>(null)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null)
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [hookExpanded, setHookExpanded] = useState(false)
  const [musicExpanded, setMusicExpanded] = useState(false)
  const [uploadExpanded, setUploadExpanded] = useState(false)
  const [templateExpanded, setTemplateExpanded] = useState(true)
  const [hookSkipped, setHookSkipped] = useState(false)
  const viralVideos = useQueryViralVideos()
  const generate = useGenerateVideo()
  const { data: session } = useSession()

  // Hook suggestions
  const hookSuggestions = [
    "This will change everything you know about...",
    "I tried this for 30 days and here's what happened",
    "The secret nobody tells you about...",
    "Stop doing this if you want to...",
    "I wish I knew this sooner",
    "This one trick changed my life",
  ]

  // Refs for each section to enable scrolling
  const templateRef = useRef<HTMLDivElement>(null)
  const hookRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const generateRef = useRef<HTMLDivElement>(null)

  // Track previous step to detect transitions
  const [previousStep, setPreviousStep] = useState(1)

  // Auto-expand/collapse sections when they become relevant
  useEffect(() => {
    if (selectedVideo) {
      setTemplateExpanded(false) // Collapse template section when style is selected
      if (!hookExpanded) {
        setHookExpanded(true) // Auto-expand hook section
      }
    }
  }, [selectedVideo, hookExpanded])

  // Auto-expand music section when hook is entered OR skipped
  useEffect(() => {
    if ((hookText || hookSkipped) && !musicExpanded) {
      setMusicExpanded(true)
    }
  }, [hookText, hookSkipped, musicExpanded])

  // Handle skip hook
  const handleSkipHook = () => {
    setHookSkipped(true)
    setHookText("") // Clear any existing hook text
  }

  // Get selected video name for display
  const selectedVideoName = viralVideos?.data?.find(v => v.name === selectedVideo)?.name || selectedVideo

  // Determine current step
  const getCurrentStep = () => {
    if (generate.isPending || generate.isSuccess) return 4 // Generate
    if (uploadedVideo && selectedVideo && hookText) return 4 // All ready for Generate
    if (selectedVideo && hookText && !uploadedVideo) return 3 // Preview (waiting for video upload)
    if (selectedVideo && !hookText) return 2 // Hook (template selected, need hook)
    return 1 // Template (need to select template)
  }

  const currentStep = getCurrentStep()

  // Auto-scroll to next step when transitioning
  useEffect(() => {
    if (currentStep !== previousStep) {
      // Step changed, scroll to the new step
      const scrollToStep = (step: number) => {
        setTimeout(() => {
          switch (step) {
            case 1:
              templateRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              break
            case 2:
              hookRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              break
            case 3:
              previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              break
            case 4:
              generateRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
              break
          }
        }, 300)
      }

      // Only scroll forward, not backward
      if (currentStep > previousStep) {
        scrollToStep(currentStep)
      }

      setPreviousStep(currentStep)
    }
  }, [currentStep, previousStep])

  const { data: tooltipData } = useQuery({
    queryKey: ["first-view-tooltip", session?.user?.id],
    queryFn: () => getFirstViewTooltip(session?.user?.id || ""),
    enabled: !!session?.user?.id,
  })

  const handleGenerate = () => {
    if (!selectedVideo) {
      return toast.error("Please select a video!")
    }

    if (!hookText) {
      return toast.error("Please enter a text!")
    }

    if (!uploadedVideo) {
      return toast.error("Please upload a video!")
    }

    // Check if we should show the warning dialog
    if (!tooltipData?.videoGeneration) {
      setShowWarningDialog(true)
    } else {
      proceedWithGeneration()
    }
  }

  const proceedWithGeneration = () => {
    // Ensure all required fields are present: video file, text, and viralVideoId
    if (!uploadedVideo || !selectedVideo || !hookText) {
      if (!uploadedVideo) toast.error("Please upload a video!")
      if (!selectedVideo) toast.error("Please select a video!")
      if (!hookText) toast.error("Please enter a text!")
      return
    }

    const videoName = typeof uploadedVideo === "string" 
      ? uploadedVideo.split("/").pop() || `${hookText}.mp4`
      : uploadedVideo.name || `${hookText}.mp4`

    generate.mutate({
      name: videoName,
      viralVideoId: selectedVideo,
      video: uploadedVideo, // Can be File or string (media key)
      text: hookText,
      musicId: selectedMusic?.split("/").pop() || "",
      // No projectId, campaignPlannerId, or day - standalone video maker
    })
  }


  const steps = [
    { id: 1, label: "Style", completed: !!selectedVideo },
    { id: 2, label: "Hook", completed: !!hookText && !!selectedVideo },
    { id: 3, label: "Preview", completed: !!uploadedVideo && !!hookText && !!selectedVideo },
    { id: 4, label: "Generate", completed: generate.isSuccess },
  ]

  return (
    <div>
      {/* Progress Bar */}
      <div className="mb-8 sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 pt-2 border-b">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>

            {/* Steps */}
            {steps.map((step, index) => {
              const isActive = currentStep === step.id
              const isCompleted = step.completed
              const isPast = currentStep > step.id

              return (
                <div key={step.id} className="flex flex-col items-center flex-1 relative">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300",
                      isActive
                        ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                        : isCompleted
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium transition-colors duration-300",
                      isActive
                        ? "text-primary font-semibold"
                        : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Template Selection - Full Width, Collapsible */}
      <Collapsible open={templateExpanded} onOpenChange={setTemplateExpanded}>
        <section ref={templateRef} className="@container mb-8 border border-border rounded-lg bg-muted/30">
          <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">
                Pick a Style to Start
              </h2>
              {selectedVideo && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">Style selected: {selectedVideoName}</span>
                </div>
              )}
            </div>
            {templateExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-6 pb-6">
              <Carousel className="w-full">
                <CarouselContent className="-ml-4 p-6">
                  {
                    viralVideos?.isLoading ?
                      Array.from({ length: 6 }, (_, i) => (
                        <CarouselItem key={i} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                          <div className="space-y-4">
                            <Skeleton className="h-48 w-full" />
                            <Skeleton className="h-48 w-full" />
                          </div>
                        </CarouselItem>
                      )) : chunk(viralVideos?.data || [], 2, {
                        style: "repeat"
                      })?.map((videos, i) => {
                        return <CarouselItem key={i.toString()} className={cn(
                          "pl-4",
                          templateExpanded 
                            ? "basis-1/2 @sm:basis-1/3 @md:basis-1/4 @lg:basis-1/5 @xl:basis-1/6"
                            : "basis-1/2 @sm:basis-1/3 @md:basis-1/4 @lg:basis-1/5"
                        )}>
                          <div className="space-y-4">
                            {
                              videos.map((video) => (
                                <VideoCard
                                  key={video.name}
                                  video={{
                                    src: video.url,
                                    title: video.name,
                                    selected: selectedVideo === video.name,
                                  }}
                                  onClick={() => {
                                    setSelectedVideo(video.name)
                                    setSelectedVideoUrl(video.url)
                                  }}
                                />
                              ))
                            }
                          </div>
                        </CarouselItem>
                      })
                  }
                </CarouselContent>
                <div className="flex items-center justify-between px-16 mt-4">
                  <CarouselPrevious className="static" />
                  <CarouselNext className="static" />
                </div>
              </Carousel>
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      {/* Hook, Upload on Left | Music & Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Hook Section - Collapsible */}
          <Collapsible open={hookExpanded} onOpenChange={setHookExpanded}>
            <section ref={hookRef} className="bg-muted rounded-lg border border-border">
              <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-muted/80 transition-colors">
                <h2 className="text-2xl font-bold">What&apos;s the Hook?</h2>
                {hookExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hook-text">Enter a compelling hook for your video</Label>
                    <Textarea
                      id="hook-text"
                      placeholder="Write something that will grab your viewers&apos; attention..."
                      value={hookText}
                      onChange={(e) => setHookText(e.target.value)}
                      className="h-24"
                    />
                  </div>
                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-2">
                    {hookSuggestions.map((suggestion, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => setHookText(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                  {/* Skip Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkipHook}
                      className="text-muted-foreground"
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>

          {/* Upload Section - Collapsible */}
          <Collapsible open={uploadExpanded} onOpenChange={setUploadExpanded}>
            <section ref={previewRef} className="border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <CollapsibleTrigger className="w-full p-8 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <h2 className="text-2xl font-bold">Add Your Clip</h2>
                {uploadExpanded ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-8 pb-8">
                  {!uploadedVideo ? (
                    <div className="space-y-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">Drag and drop your video file here or click to browse</p>
                        <div className="relative">
                          <SelectVideoDialog
                            sessionId={sessionId}
                            onSelect={async (vid) => {
                              if (vid instanceof File) {
                                setUploadedVideo(vid)
                                setUploadedVideoUrl(URL.createObjectURL(vid))
                              } else {
                                // vid is { key, url }
                                setUploadedVideo(vid.key)
                                setUploadedVideoUrl(vid.url)
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                        <video src={uploadedVideoUrl || undefined} controls className="w-full h-full">
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setUploadedVideo(null)
                            setUploadedVideoUrl(null)
                          }}
                        >
                          Change Video
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </section>
          </Collapsible>
        </div>

        {/* Music & Preview on Right */}
        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            {/* Music Section - Collapsible */}
            <Collapsible open={musicExpanded} onOpenChange={setMusicExpanded}>
              <div className="border border-border rounded-lg">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold">🎵 Music</h3>
                  {musicExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <MediaSelectionDialog onSelect={(m) => {
                      setSelectedMusic(m.key)
                    }} />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Video Preview */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Video Preview</h2>
              {selectedVideoUrl ? (
                <VideoPreview
                  videos={uploadedVideoUrl ? [selectedVideoUrl, uploadedVideoUrl] : [selectedVideoUrl]}
                  overlayText={hookText || undefined}
                />
              ) : (
                <div className="rounded-lg overflow-hidden bg-muted aspect-[17/30] flex items-center justify-center">
                  <p className="text-muted-foreground text-center p-4">Select a style to see preview</p>
                </div>
              )}
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-medium">Your Hook</h3>
                  <p className="text-muted-foreground">
                    {hookSkipped 
                      ? "Hook skipped" 
                      : hookText || "Add a hook to engage your audience"}
                  </p>
                </div>
                {selectedVideo && (
                  <div>
                    <h3 className="font-medium">Selected Style</h3>
                    <p className="text-primary font-medium">{selectedVideoName}</p>
                  </div>
                )}
                {uploadedVideo && (
                  <div>
                    <h3 className="font-medium">Your Clip</h3>
                    <p className="text-primary font-medium">✓ Uploaded</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Generate Button */}
      <div ref={generateRef} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg px-12 py-6 text-lg font-semibold min-w-64 h-16 disabled:opacity-100"
          onClick={handleGenerate}
          loading={generate.isPending}
        >
          👉 Generate Video
        </Button>
      </div>

      {/* Credit Warning Dialog */}
      <VideoCreditWarningDialog
        open={showWarningDialog}
        onOpenChange={setShowWarningDialog}
        onConfirm={proceedWithGeneration}
      />

    </div >
  )
}

