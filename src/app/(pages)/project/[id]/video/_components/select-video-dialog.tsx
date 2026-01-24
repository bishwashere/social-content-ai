"use client"

import type React from "react"

import { useState, useRef } from "react"

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
import { useQueryAllUserMedia, useUploadMedia, useUploadMediaForVideoMaker } from "@/backend-apis/video-generation/hooks"
import { useParams } from "next/navigation"
import { Upload } from "lucide-react"

type Props = {
  onSelect: (video: File | { key: string; url: string }) => void
  projectId?: string // Optional - if not provided, it's video maker mode
  sessionId?: string // For video maker mode - unique session ID
}

export default function SelectVideoDialog({ onSelect, projectId, sessionId }: Props) {
  const params = useParams()
  const id = params?.id as string | undefined
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedVideo, setSelectedVideo] = useState<{ key: string; url: string } | null>(null)
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)
  const uploadMedia = useUploadMedia()
  const uploadVideoMaker = useUploadMediaForVideoMaker()

  // Query all user media from all projects
  const allUserMedia = useQueryAllUserMedia()
  
  // Filter to only video files
  const videoFiles = allUserMedia?.data?.filter(file => 
    file.key?.endsWith('.mp4') || 
    file.key?.endsWith('.mov') || 
    file.key?.endsWith('.avi') ||
    file.key?.endsWith('.webm')
  ) || []

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingFile(file)
    setSelectedVideo(null) // Clear selection
    
    // Upload to media-uploads immediately
    try {
      if (projectId || id) {
        await uploadMedia.mutateAsync({ projectId: projectId || id || "", file })
      } else {
        if (!sessionId) {
          throw new Error("Session ID is required for video maker mode")
        }
        await uploadVideoMaker.mutateAsync({ file, sessionId })
      }
      // The query will automatically refetch and show the new video
      setUploadingFile(null)
    } catch (error) {
      console.error("Upload failed:", error)
      setUploadingFile(null)
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSelect = () => {
    if (selectedVideo) {
      onSelect(selectedVideo)
      setOpen(false)
      setSelectedVideo(null)
    }
  }

  const handleVideoClick = (video: { key: string; url: string }) => {
    setSelectedVideo(video)
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          // Reset state when dialog closes
          setSelectedVideo(null)
          setUploadingFile(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Select Video File</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select or Upload Video</DialogTitle>
          <DialogDescription>
            Choose from your existing videos or upload a new one.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1">
          {/* Upload Button */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
              disabled={uploadingFile !== null}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploadingFile ? "Uploading..." : "Upload New Video"}
            </Button>
          </div>

          {/* Show all user videos */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {
              allUserMedia?.isLoading ? Array.from({ length: 6 }, (_, i) => (
                <Skeleton className="h-48 w-full" key={i} />
              )) :
                videoFiles.length > 0 ? (
                  videoFiles.map((video) => (
                    <div
                      key={video.key}
                      className={cn(
                        "relative rounded-lg border max-h-72 overflow-hidden cursor-pointer transition-all hover:bg-accent",
                        selectedVideo?.key === video.key && "ring-2 ring-primary"
                      )}
                      onClick={() => handleVideoClick({ key: video.key, url: video.url })}
                    >
                      <div className="relative">
                        <video
                          src={video.url}
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => e.currentTarget.pause()}
                          className="object-cover object-center w-full h-full"
                          muted
                        />
                      </div>
                      <div className="p-2 absolute bottom-0 bg-muted left-0 w-full">
                        <h3 className="font-medium text-sm line-clamp-1 truncate">
                          {video.key.split('/').pop() || video.name}
                        </h3>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    No videos uploaded yet. Upload your first video!
                  </div>
                )
            }
          </div>

          {/* Show selected video preview */}
          {selectedVideo && (
            <div className="mb-4 p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">Selected Video:</p>
              <div className="rounded-lg overflow-hidden bg-muted aspect-video">
                <video src={selectedVideo.url} controls className="w-full h-full">
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          )}

          {uploadingFile && (
            <div className="mb-4 p-4 border rounded-lg">
              <p className="text-sm font-medium mb-2">Uploading:</p>
              <p className="text-sm text-muted-foreground">{uploadingFile.name}</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait...</p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button disabled={!selectedVideo} onClick={handleSelect}>
            Select
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

