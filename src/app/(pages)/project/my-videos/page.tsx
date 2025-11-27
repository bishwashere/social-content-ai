"use client"

import React, { useEffect, useState } from 'react'
import { useQueryAllUploadedVideos } from '@/backend-apis/video-generation/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Download, ExternalLink, Clock, CheckCircle2, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { useOAuthProviders } from '@/server-actions/oauth-providers/hooks'
import { signIn } from 'next-auth/react'
import { uploadToTiktok } from '@/server-actions/upload-tiktok'
import { toast } from 'sonner'

const MyVideosPage = () => {
  const { data: videos, isLoading } = useQueryAllUploadedVideos()
  const { data: oauthProviders, isLoading: isLoading2 } = useOAuthProviders();
  const [uploading, setUploading] = useState(false);

  const uploadVideoToTiktok = async (mediaId: string, userId: string) => {
    setUploading(true);
    try {
      const res = await uploadToTiktok(mediaId, userId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      console.log("Error while posting video.", e);
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || isLoading2) {
    return (
      <div className="flex-grow max-w-7xl mx-auto p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="text-muted-foreground mt-2">
            All your generated videos in one place
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-grow max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="text-muted-foreground mt-2">
            All your generated videos in one place
          </p>
        </div>
        {!!!oauthProviders?.find(provider => provider.platform === "tiktok") && <Button variant="default" size="sm" onClick={() => signIn("tiktok")}>Connect Tiktok</Button>}
      </div>

      {(!videos || videos.length === 0) ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-purple-100 rounded-full">
              <svg
                className="w-12 h-12 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first video using the Quick Video Maker!
              </p>
              <Button
                onClick={() => window.location.href = '/project/video-maker'}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Create Video
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <video
                  src={video.output || video.input}
                  className="w-full h-48 object-cover"
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause()
                    e.currentTarget.currentTime = 0
                  }}
                  muted
                  loop
                />
                <div className="absolute top-2 right-2">
                  {video.status === "completed" ? (
                    <Badge className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {video.isPublised ? 'Published' : 'Completed'}
                    </Badge>
                  ) : (
                    <Badge className="bg-orange-500 hover:bg-orange-600">
                      <Clock className="w-3 h-3 mr-1" />
                      Processing
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm line-clamp-2 mb-1">
                    {video.text || "Untitled Video"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(video.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>

                {(video.status === "completed" || video.status === "published") && video.output && (
                  <div className="flex gap-2">
                    {video.status !== "published" && oauthProviders?.find(provider => provider.platform === "tiktok") ?
                      <Button
                        size="sm"
                        className="flex-1"
                        variant="secondary"
                        onClick={() => uploadVideoToTiktok(video.id, video.userId)}
                        disabled={uploading}
                      >
                        {!uploading && <Share className="w-4 h-4 mr-2" />}
                        {uploading ? 'Uploading...' : 'Upload to Tiktok'}
                      </Button>
                      :
                      <Button
                        asChild
                        size="sm"
                        className="flex-1"
                        variant="secondary"
                      >
                        <a href={video.output} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </a>
                      </Button>
                    }

                    <Button
                      asChild
                      size="sm"
                      className="flex-1"
                    >
                      <a href={video.output} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}

                {video.status === "pending" && (
                  <div className="text-xs text-center text-muted-foreground py-2 bg-muted rounded">
                    Your video is being processed. Check back soon!
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default MyVideosPage

