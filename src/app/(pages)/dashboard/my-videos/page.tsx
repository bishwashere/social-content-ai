"use client"

import React, { useState, useMemo } from 'react'
import { useQueryAllUploadedVideos, useQueryAllUserMedia, useDeleteProcessingVideo } from '@/backend-apis/video-generation/hooks'
import { useGetAllProjects } from '@/backend-apis/projects/hooks'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Download, ExternalLink, Clock, CheckCircle2, Share, Video, Trash2, Play, X, Folder, Image, Film } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { uploadToTiktok } from '@/server-actions/upload-tiktok'
import { toast } from 'sonner'
import { checkAllProjectOAuthProviders } from '@/server-actions/check-project-oauth-provider'
import { useSession } from '@/backend-apis/auth/hooks'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateCheckoutSession } from '@/backend-apis/payment/hooks'
import { useRouter } from 'next/navigation'

interface PreviewVideo {
  url: string;
  title: string;
  projectId?: string;
  mediaId?: string;
  canUploadToTiktok?: boolean;
  isPublished?: boolean;
}

interface MediaFile {
  key: string;
  name: string;
  url: string;
  projectId?: string;
  projectName?: string;
}

const MyVideosPage = () => {
  const { data: session } = useSession();
  const { data: videos, isLoading } = useQueryAllUploadedVideos();
  const { data: allUserMedia, isLoading: isLoadingMedia } = useQueryAllUserMedia();
  const { data: projects } = useGetAllProjects();
  const deleteVideo = useDeleteProcessingVideo();
  const payment = useCreateCheckoutSession();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<PreviewVideo | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>("all");

  // Parse media files and associate with project names
  const processedMedia = useMemo(() => {
    if (!allUserMedia || !session?.user?.id) return { byProject: {}, allMedia: [] };

    const projectMap = new Map<string, string>();
    projects?.forEach((project: { id: string; name: string }) => {
      projectMap.set(project.id, project.name);
    });

    const mediaWithProjects: MediaFile[] = allUserMedia.map((file) => {
      // Key format: media-uploads/{userId}/{projectId}/{filename}
      // or media-uploads/{userId}/video-maker-{sessionId}/{filename}
      const keyParts = file.key?.split('/') || [];
      const projectIdOrFolder = keyParts[2]; // Third part is projectId or video-maker-xxx

      let projectName = 'Unknown Project';
      let projectId = projectIdOrFolder;

      if (projectIdOrFolder?.startsWith('video-maker-')) {
        projectName = 'Video Maker Uploads';
        projectId = 'video-maker';
      } else if (projectMap.has(projectIdOrFolder)) {
        projectName = projectMap.get(projectIdOrFolder) || 'Unknown Project';
      }

      return {
        key: file.key,
        name: file.name,
        url: file.url,
        projectId,
        projectName,
      };
    });

    // Group by project
    const byProject: Record<string, MediaFile[]> = {};
    mediaWithProjects.forEach((media) => {
      const key = media.projectId || 'unknown';
      if (!byProject[key]) {
        byProject[key] = [];
      }
      byProject[key].push(media);
    });

    return { byProject, allMedia: mediaWithProjects };
  }, [allUserMedia, projects, session?.user?.id]);

  // Get unique projects for filter dropdown
  const projectFilterOptions = useMemo(() => {
    const options: { id: string; name: string }[] = [{ id: 'all', name: 'All Projects' }];
    Object.entries(processedMedia.byProject).forEach(([projectId, media]) => {
      if (media.length > 0) {
        options.push({
          id: projectId,
          name: media[0].projectName || 'Unknown Project',
        });
      }
    });
    return options;
  }, [processedMedia.byProject]);

  // Filter media based on selected project
  const filteredMedia = useMemo(() => {
    if (selectedProjectFilter === 'all') {
      return processedMedia.allMedia;
    }
    return processedMedia.byProject[selectedProjectFilter] || [];
  }, [selectedProjectFilter, processedMedia]);

  const handleDeleteVideo = async (videoId: string) => {
    setDeletingVideoId(videoId);
    try {
      await deleteVideo.mutateAsync(videoId);
    } finally {
      setDeletingVideoId(null);
    }
  };

  const uploadVideoToTiktok = async (mediaId: string, projectId: string) => {
    if (!session?.user.id) return;
    if (!projectId) {
      toast.error("Video not related to project");
      return;
    }
    setUploading(true);
    const oauthProviders = await checkAllProjectOAuthProviders(
      projectId,
      session.user.id,
      ["tiktok"]
    );
    const tiktokProvider = oauthProviders["tiktok"];
    if (!tiktokProvider.hasProviderConnected) {
      toast.error("Error: Tiktok account not connected")
      setUploading(false);
      return;
    }
    if (!tiktokProvider.isProjectMapped || !tiktokProvider.mappedProviders) {
      toast.error("Error: Tiktok account not connected with project")
      setUploading(false);
      return;
    }
    try {
      const res = await uploadToTiktok(mediaId, tiktokProvider.mappedProviders[0].id);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (e) {
      console.log("Error while posting video.", e);
      toast.error("Some error occurred!")
    } finally {
      setUploading(false);
    }
  }

  const renderGeneratedVideos = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-lg" />
          ))}
        </div>
      )
    }

    if (!videos || videos.length === 0) {
      return (
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
                Create your first video using Create a Viral Video!
              </p>
              <Button
                onClick={() => window.location.href = '/dashboard/video-maker'}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Create Video
              </Button>
            </div>
          </div>
        </Card>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative group">
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
              {/* Play button overlay for preview */}
              {(video.status === "completed" || video.status === "published") && video.output && (
                <div 
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => setPreviewVideo({
                    url: video.output!,
                    title: video.text || "Untitled Video",
                    projectId: video.projectId || undefined,
                    mediaId: video.id,
                    canUploadToTiktok: video.status !== "published",
                    isPublished: video.isPublised,
                  })}
                >
                  <div className="bg-white/90 rounded-full p-3 hover:bg-white transition-colors">
                    <Play className="w-8 h-8 text-purple-600 fill-purple-600" />
                  </div>
                </div>
              )}
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
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    className="w-full"
                    variant="outline"
                    onClick={() => setPreviewVideo({
                      url: video.output!,
                      title: video.text || "Untitled Video",
                      projectId: video.projectId || undefined,
                      mediaId: video.id,
                      canUploadToTiktok: video.status !== "published",
                      isPublished: video.isPublised,
                    })}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <div className="flex gap-2">
                    {video.status !== "published" ?
                      <Button
                        size="sm"
                        className="flex-1"
                        variant="secondary"
                        onClick={() => uploadVideoToTiktok(video.id, video.projectId || "")}
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
                </div>
              )}

              {video.status === "pending" && (
                <div className="space-y-2">
                  <div className="text-xs text-center text-muted-foreground py-2 bg-muted rounded">
                    Your video is being processed. Check back soon!
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        disabled={deletingVideoId === video.id}
                      >
                        {deletingVideoId === video.id ? (
                          "Deleting..."
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Processing Video
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Processing Video?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this video and all associated files (video, metadata, text files) from storage. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteVideo(video.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Helper to determine if a file is an image or video
  const isImageFile = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const ext = filename?.toLowerCase().substring(filename.lastIndexOf('.')) || '';
    return imageExtensions.includes(ext);
  };

  const isVideoFile = (filename: string) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
    const ext = filename?.toLowerCase().substring(filename.lastIndexOf('.')) || '';
    return videoExtensions.includes(ext);
  };

  const renderUploadedMedia = () => {
    if (isLoadingMedia) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-lg" />
          ))}
        </div>
      )
    }

    if (!processedMedia.allMedia || processedMedia.allMedia.length === 0) {
      return (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Video className="w-12 h-12 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">No uploaded media yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload media to your projects to see them here!
              </p>
            </div>
          </div>
        </Card>
      )
    }

    return (
      <div className="space-y-4">
        {/* Project Filter */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter by project:</span>
          </div>
          <Select value={selectedProjectFilter} onValueChange={setSelectedProjectFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projectFilterOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filteredMedia.length} {filteredMedia.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMedia.map((media) => (
            <Card key={media.key} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative group">
                {isVideoFile(media.name) ? (
                  <>
                    <video
                      src={media.url}
                      className="w-full h-48 object-cover bg-gray-100"
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause()
                        e.currentTarget.currentTime = 0
                      }}
                      muted
                      loop
                    />
                    {/* Play button overlay for video preview */}
                    <div 
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => setPreviewVideo({
                        url: media.url,
                        title: media.name || "Untitled Video",
                      })}
                    >
                      <div className="bg-white/90 rounded-full p-3 hover:bg-white transition-colors">
                        <Play className="w-8 h-8 text-purple-600 fill-purple-600" />
                      </div>
                    </div>
                  </>
                ) : isImageFile(media.name) ? (
                  <img
                    src={media.url}
                    alt={media.name}
                    className="w-full h-48 object-cover bg-gray-100"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <Film className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                {/* Media Type Badge */}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-black/60 text-white hover:bg-black/70">
                    {isVideoFile(media.name) ? (
                      <><Film className="w-3 h-3 mr-1" /> Video</>
                    ) : isImageFile(media.name) ? (
                      <><Image className="w-3 h-3 mr-1" /> Image</>
                    ) : (
                      'File'
                    )}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm line-clamp-2 mb-1" title={media.name}>
                    {media.name || "Untitled"}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Folder className="w-3 h-3" />
                    <span className="truncate" title={media.projectName}>
                      {media.projectName}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isVideoFile(media.name) ? (
                    <Button
                      size="sm"
                      className="flex-1"
                      variant="secondary"
                      onClick={() => setPreviewVideo({
                        url: media.url,
                        title: media.name || "Untitled Video",
                      })}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  ) : (
                    <Button
                      asChild
                      size="sm"
                      className="flex-1"
                      variant="secondary"
                    >
                      <a href={media.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </a>
                    </Button>
                  )}

                  <Button
                    asChild
                    size="sm"
                    className="flex-1"
                  >
                    <a href={media.url} download={media.name}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto py-8 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-6">
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="text-muted-foreground mt-2">
            Manage your generated videos and uploaded media
          </p>
        </div>
        {/* {!!!oauthProviders?.find(provider => provider.platform === "tiktok") && <Button variant="default" size="sm" onClick={() => signIn("tiktok")}>Connect Tiktok</Button>} */}
      </div>

      <Tabs defaultValue="generated" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="generated">Generated Videos</TabsTrigger>
          <TabsTrigger value="media">Uploaded Media</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generated" className="mt-6">
          {renderGeneratedVideos()}
        </TabsContent>
        
        <TabsContent value="media" className="mt-6">
          {renderUploadedMedia()}
        </TabsContent>
      </Tabs>

      {/* Subscribe CTA */}
      <div className="mt-12 flex justify-center">
        <Button
          onClick={async () => {
            try {
              const res = await payment.mutateAsync("subscription");
              if (res?.data?.redirectUrl) {
                router.push(res.data.redirectUrl);
              }
            } catch (error) {
              console.error("Error creating checkout session:", error);
            }
          }}
          disabled={payment.isPending}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg"
        >
          {payment.isPending ? "Loading..." : "Start Premium"}
        </Button>
      </div>

      {/* Video Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="line-clamp-1 pr-8">{previewVideo?.title}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-4 pt-2">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                src={previewVideo?.url}
                className="w-full max-h-[60vh] object-contain"
                controls
                autoPlay
              />
            </div>
            <div className="flex gap-2 mt-4">
              {previewVideo?.canUploadToTiktok && previewVideo?.mediaId && previewVideo?.projectId && (
                <Button
                  size="sm"
                  className="flex-1"
                  variant="secondary"
                  onClick={() => {
                    uploadVideoToTiktok(previewVideo.mediaId!, previewVideo.projectId!);
                  }}
                  disabled={uploading}
                >
                  {!uploading && <Share className="w-4 h-4 mr-2" />}
                  {uploading ? 'Uploading...' : 'Upload to Tiktok'}
                </Button>
              )}
              {previewVideo?.isPublished && (
                <Button
                  asChild
                  size="sm"
                  className="flex-1"
                  variant="secondary"
                >
                  <a href={previewVideo.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Platform
                  </a>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className="flex-1"
              >
                <a href={previewVideo?.url} download>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MyVideosPage

