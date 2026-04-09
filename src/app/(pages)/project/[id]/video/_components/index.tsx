"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Upload, SparklesIcon, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Skeleton } from "@/components/ui/skeleton"
import chunk from "@/lib/chunk"
import { toast } from "sonner"
import { useGenerateVideo, useGetFreeVideoLimitStatus, useQueryViralVideos } from "@/backend-apis/video-generation/hooks"
import { VideoCard } from "./video-card"
import SelectVideoDialog from "./select-video-dialog"
import { MediaSelectionDialog } from "./select-music-dialog"
import VideoPreview from "./video-preview"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { VideoCreditWarningDialog } from "@/components/common/video-credit-warning-dialog"
import { useSession } from "@/backend-apis/auth/hooks"
import { useQuery } from "@tanstack/react-query"
import { getFirstViewTooltip } from "@/server-actions/first-view-tooltip/actions"


export default function VideoSelectionPage() {
  const [hookText, setHookText] = useState("")
  const [uploadedVideo, setUploadedVideo] = useState<File | string | null>(null)
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null)
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null)
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null)
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null)
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const viralVideos = useQueryViralVideos()
  const generate = useGenerateVideo()
  const { id } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter()
  const { data: session } = useSession()
  const { data: freeVideoLimit } = useGetFreeVideoLimitStatus()

  const { data: tooltipData } = useQuery({
    queryKey: ["first-view-tooltip", session?.user?.id],
    queryFn: () => getFirstViewTooltip(session?.user?.id || ""),
    enabled: !!session?.user?.id,
  })

  useEffect(() => {
    const day = searchParams.get("day")
    const campaignId = searchParams.get("campaignId")

    if (!day || !campaignId) {
      router.push(`/project/${id}`)
    }

  }, [searchParams])

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

    generate.mutate({
      name: typeof uploadedVideo === "string" ? uploadedVideo.split("/").pop() || `${hookText}.mp4` : uploadedVideo.name || `${hookText}.mp4`,
      viralVideoId: selectedVideo,
      video: uploadedVideo,
      text: hookText,
      musicId: selectedMusic?.split("/").pop() || "",
      projectId: id as string,
      campaignPlannerId: searchParams.get("campaignId") || "",
      day: Number(searchParams.get("day") || 0),
    })
  }


  if (freeVideoLimit?.hasReachedFreeLimit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-16 space-y-6">
        <div className="p-5 bg-purple-100 rounded-full">
          <Lock className="h-10 w-10 text-purple-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">You&apos;ve used your free video</h2>
          <p className="text-muted-foreground max-w-md">
            Free plan includes <strong>1 video generation</strong> so you can try it out.
            Upgrade to a paid plan to generate unlimited videos — your remaining credits
            can still be used for posts and other content.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white px-8"
          onClick={() => router.push("/dashboard/billing")}
        >
          Upgrade to Generate More Videos
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="@container">
            <h2 className="text-2xl font-bold mb-4">
              Step 1 of 3 : Pick a Style
            </h2>
            <Carousel className="w-full ">
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
                      return <CarouselItem key={i.toString()} className="pl-4 basis-1/2 @sm:basis-1/3 @md:basis-1/4 @lg:basis-1/5 @xl:basis-1/6">
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
          </section>

          <section className="bg-muted p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Step 2 of 3 : What&apos;s the hook?</h2>
            <div className="space-y-4">
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
            </div>
          </section>

          <section className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Step 3 of 3 : Upload Your Demo Video</h2>
            {!uploadedVideo ? (
              <div className="space-y-4 text-center">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">Drag and drop your video file here or click to browse</p>
                  <div className="relative">
                    <SelectVideoDialog
                      projectId={id as string}
                      onSelect={(vid) => {
                        console.log(vid)
                        if (vid instanceof File) {
                          setUploadedVideo(vid)
                          setUploadedVideoUrl(URL.createObjectURL(vid))
                        } else {
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
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8">

            <MediaSelectionDialog onSelect={(m) => {
              setSelectedMusic(m.key)
            }} />

            <h2 className="text-2xl font-bold mb-4 mt-8">Video Preview</h2>
            {selectedVideoUrl && uploadedVideoUrl ? <VideoPreview
              videos={[selectedVideoUrl || "", uploadedVideoUrl]}
              overlayText={hookText}
            /> : <div className="rounded-lg overflow-hidden bg-muted aspect-[17/30]">
              <video
                src={undefined}
                controls
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>}
            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-medium">Your Hook</h3>
                <p className="text-muted-foreground">{hookText || "Add a hook to engage your audience"}</p>
              </div>
              {selectedVideo && (
                <div>
                  <h3 className="font-medium">Selected Video</h3>
                  <p className="text-primary font-medium">Video {selectedVideo}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Generate Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg px-8 font-semibold min-w-40 disabled:opacity-100"
          onClick={handleGenerate}
          loading={generate.isPending}
        >
          Generate <SparklesIcon className="ml-2 h-4 w-4" />
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

