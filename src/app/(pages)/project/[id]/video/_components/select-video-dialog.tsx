"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/cn"
import { useQueryAllUploadedVideos } from "@/backend-apis/video-generation/hooks"

type Props = {
  onSelect: (video: File | { videoId: string, url: string }) => void
}

export default function SelectVideoDialog({ onSelect }: Props) {
  const [selectedVideo, setSelectedVideo] = useState<{
    videoId: string,
    url: string
  } | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const vids = useQueryAllUploadedVideos()


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

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
        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">Video Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="library" className="mt-4">
            <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-1">
              {
                vids?.isLoading ? Array.from({ length: 6 }, (_, i) => (
                  <Skeleton className="h-48 w-full" key={i} />
                )) :
                  vids?.data?.map((video) => (
                    <div
                      key={video.id}
                      className={cn(`relative rounded-lg border max-h-72 overflow-hidden cursor-pointer transition-all `, selectedVideo?.videoId === video.inputFullPath ? "ring-2 ring-primary" : "hover:bg-accent"
                      )}
                      onClick={() => {
                        setSelectedVideo({ videoId: video.inputFullPath, url: video.input })
                      }}
                    >
                      <div className="relative">
                        <video
                          src={video.input}
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => e.currentTarget.pause()}
                          className="object-cover object-center"
                          muted
                        />
                      </div>
                      <div className="p-2 absolute bottom-0 bg-muted left-0 w-full">
                        <h3 className="font-medium text-sm line-clamp-1 truncate">{video.text}</h3>
                      </div>
                    </div>
                  ))}
            </div>
            <div className="flex justify-end mt-4">
              <Button disabled={!selectedVideo} onClick={() => onSelect(selectedVideo!)}>Select</Button>
            </div>
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Drag and drop your video here</p>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={() => videoInputRef.current?.click()}
                    >
                      {uploadedFile ? "Change File" : "Select File"}
                    </Button>
                    <Input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      ref={videoInputRef}
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>
              {uploadedFile && (
                <div className="text-sm">
                  <p className="font-medium">Selected file:</p>
                  <p className="text-muted-foreground">{uploadedFile.name}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button disabled={!uploadedFile} onClick={() => onSelect(uploadedFile!)}>Upload</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

