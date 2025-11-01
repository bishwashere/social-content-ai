"use client";

import type {
  OauthProvider,
  Projects as Project,
  ScheduledPost,
} from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Facebook,
  Twitter,
  Linkedin,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Trash,
  Pencil,
  Eye,
  ChevronDown,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Md from "react-markdown";
import LinkedinPostView from "@/components/social/linkedin-post-view";
import FacebookPostView from "@/components/social/facebook-post-view";
import XPostView from "@/components/social/x-post-view";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ThreadsPost from "@/components/social/threads-post-view";
import ThreadsPostView from "@/components/social/threads-post-view";
import RedditPostView from "@/components/social/reddit-post-view";
interface Props {
  project: Project;
}

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "facebook":
      return <Facebook className="h-4 w-4" />;
    case "twitter":
      return <Twitter className="h-4 w-4" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4" />;
    case "threads":
      return <img src="/threads.svg" className="h-6 w-6" />;
    default:
      return null;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case "facebook":
      return "bg-blue-500";
    case "twitter":
      return "bg-sky-500";
    case "linkedin":
      return "bg-blue-700";
    case "threads":
      return "bg-muted rounded-full border border-gray-300";
    default:
      return "bg-gray-500";
  }
};

const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case "success":
    case "published":
    case "completed":
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    case "failed":
    case "error":
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    case "pending":
    case "scheduled":
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function ScheduledPosts({ project }: Props) {
  const [viewContentEdit, setViewContentEdit] = useState<string[]>([]);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery<(ScheduledPost & { oauthProvider: OauthProvider })[]>({
    queryKey: ["scheduledPosts", project.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/scheduled-posts?projectId=${project.id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch scheduled posts");
      }
      return response.json();
    },
  });

  const deleteScheduledPost = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/scheduled-posts?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete scheduled post");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Deleted scheduled post");
      queryClient.invalidateQueries({
        queryKey: ["scheduledPosts", project.id],
      });
    },
    onError: () => {
      toast.error("Failed to delete scheduled post");
    },
  });

  const onDeleteScheduledPost = async (id: string) => {
    const yes = await confirm({
      title: "Do you want to delete this scheduled post ?",
      description: "",
    });
    if (!yes) return;
    deleteScheduledPost.mutate(id);
  };

  const toggleCampaign = (campaignId: string) => {
    setExpandedCampaigns((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const renderPostCard = (post: ScheduledPost & { oauthProvider: OauthProvider }) => (
    <Card key={post.id} className="w-full">
      <CardHeader className="pb-3">
        <div className="relative flex items-center">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full text-white ${getPlatformColor(
                post.platform
              )}`}
            >
              {getPlatformIcon(post.platform)}
            </div>
            <div>
              <CardTitle className="text-lg capitalize flex flex-row gap-2">
                {post.platform}
                <div className="flex items-center gap-2">
                  {getStatusBadge(post.status)}
                </div>
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Scheduled For: {formatDate(post.date)}
              </CardDescription>
            </div>
          </div>
          <div className="absolute -top-3 right-0 flex gap-2">
            <ToggleGroup
              variant={"outline"}
              value={
                viewContentEdit.includes(post.id) ? "edit" : "preview"
              }
              type="single"
              onValueChange={() => {
                setViewContentEdit((prev) =>
                  viewContentEdit.includes(post.id)
                    ? prev.filter((item) => item !== post.id)
                    : [...prev, post.id]
                );
              }}
            >
              <ToggleGroupItem value="preview">
                <Eye className="size-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="edit">
                <Pencil className="size-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDeleteScheduledPost(post.id)}
              loading={deleteScheduledPost.isPending}
            >
              <Trash className="stroke-red-500 size-5" />
            </Button>
          </div>
        </div>
        {post.error && (post.status === "error" || post.status === "failed") && (
          <p className="text-sm text-destructive px-4">
            {post.error}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4 p-1">
        <div className="flex w-full items-center justify-center ">
          {post.platform === "facebook" ? (
            <FacebookPostView
              post={post}
              viewContentEdit={viewContentEdit}
              setViewContentEdit={setViewContentEdit}
            />
          ) : post.platform === "linkedin" ? (
            <LinkedinPostView
              post={post}
              viewContentEdit={viewContentEdit}
              setViewContentEdit={setViewContentEdit}
            />
          ) : post.platform === "twitter" ? (
            <XPostView
              post={post}
              viewContentEdit={viewContentEdit}
              setViewContentEdit={setViewContentEdit}
            />
          ) : post.platform === "threads" ? (
            <ThreadsPostView
              post={post}
              viewContentEdit={viewContentEdit}
              setViewContentEdit={setViewContentEdit}
            />
          ) : post.platform === "reddit" ? (
            <RedditPostView
              post={post}
              viewContentEdit={viewContentEdit}
              setViewContentEdit={setViewContentEdit}
            />
          ) : post.platform === "threads" ? (
            <ThreadsPost post={post}
              viewContentEdit={viewContentEdit}
              setViewContentEdit={setViewContentEdit} />
          ) : (
            <div
              className="text-sm text-muted-foreground w-full"
              style={{ whiteSpace: "pre-wrap" }}
            >
              <Md>
                {post.content
                  .split("\n")
                  .map((line) => line.trim())
                  .filter((line) => line.length > 0)
                  .join("\n\n")}
              </Md>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Separate posts into regular and campaign posts
  const regularPosts = posts.filter((post) => {
    const meta = post.meta as any;
    return !meta || !meta.campaignId;
  });

  // Group campaign posts by campaignId
  const campaignPostsMap = new Map<string, typeof posts>();
  posts.forEach((post) => {
    const meta = post.meta as any;
    if (meta && meta.campaignId) {
      const campaignId = meta.campaignId;
      if (!campaignPostsMap.has(campaignId)) {
        campaignPostsMap.set(campaignId, []);
      }
      campaignPostsMap.get(campaignId)!.push(post);
    }
  });

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Scheduled Posts</h2>
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Failed to load scheduled posts</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mx-4 sm:mx-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Scheduled Posts</h2>
          <p className="text-muted-foreground">
            {project.name
              ? `Posts for ${project.name}`
              : "Manage your scheduled social media posts"}
          </p>
        </div>
        {!isLoading && posts.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {posts.length} posts •{" "}
            {campaignPostsMap.size > 0 && `${campaignPostsMap.size} campaigns • `}
            {
              posts.filter(
                (p) => p.status === "success" || p.status === "published"
              ).length
            }{" "}
            published •{" "}
            {
              posts.filter(
                (p) => p.status === "pending" || p.status === "scheduled"
              ).length
            }{" "}
            scheduled
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="ml-2 text-muted-foreground">
            Loading scheduled posts...
          </p>
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No scheduled posts found</p>
            <p className="text-muted-foreground mt-2">
              Create your first scheduled post to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {/* Campaign Posts - Grouped */}
          {Array.from(campaignPostsMap.entries()).map(([campaignId, campaignPosts]) => {
            const firstPost = campaignPosts[0];
            const meta = firstPost.meta as any;
            const campaignName = meta?.campaignName || `Campaign (${campaignId.slice(-6)})`;
            const isExpanded = expandedCampaigns.has(campaignId);
            const sortedPosts = [...campaignPosts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const earliestDate = sortedPosts[0]?.date;
            const latestDate = sortedPosts[sortedPosts.length - 1]?.date;
            const statuses = campaignPosts.map(p => p.status);
            const pendingCount = statuses.filter(s => s === "pending" || s === "scheduled").length;
            const successCount = statuses.filter(s => s === "success" || s === "published").length;
            const failedCount = statuses.filter(s => s === "failed" || s === "error").length;

            return (
              <Card key={campaignId} className="w-full">
                <CardHeader className="pb-3">
                  <button
                    onClick={() => toggleCampaign(campaignId)}
                    className="w-full relative flex items-center cursor-pointer hover:bg-muted/50 -m-4 p-4 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <FolderOpen className="h-5 w-5 text-blue-500" />
                      <div className="flex-1 text-left">
                        <CardTitle className="text-lg flex flex-row gap-2 items-center">
                          {campaignName}
                          <Badge variant="outline" className="text-xs">
                            Campaign
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {campaignPosts.length} posts
                          </span>
                          {earliestDate && latestDate && (
                            <span className="text-xs">
                              {formatDate(earliestDate)} - {formatDate(latestDate)}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            {pendingCount > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {pendingCount} pending
                              </Badge>
                            )}
                            {successCount > 0 && (
                              <Badge variant="default" className="bg-green-500 text-xs">
                                {successCount} published
                              </Badge>
                            )}
                            {failedCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {failedCount} failed
                              </Badge>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </button>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 space-y-4">
                    {sortedPosts.map((post) => renderPostCard(post))}
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Regular Posts */}
          {regularPosts.map((post) => renderPostCard(post))}
        </div>
      )}
    </div>
  );
}
