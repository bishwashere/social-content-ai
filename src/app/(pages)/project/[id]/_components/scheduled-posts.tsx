"use client";

import Image from "next/image";
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
  Instagram,
  X,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  History,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import LinkedinPostView from "@/components/social/linkedin-post-view";
import FacebookPostView from "@/components/social/facebook-post-view";
import XPostView from "@/components/social/x-post-view";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import ThreadsPostView from "@/components/social/threads-post-view";
import RedditPostView from "@/components/social/reddit-post-view";
import InstagramPostView from "@/components/social/instagram-post-view";
import { PLATFORM_IDS, PLATFORM_ICONS } from "@/constants/platforms";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/cn";

interface Props {
  project: Project;
}

type PostWithProvider = ScheduledPost & { oauthProvider: OauthProvider };

const getPlatformIcon = (platform: string, size: "sm" | "md" = "sm") => {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const imgSize = size === "sm" ? 16 : 20;

  switch (platform.toLowerCase()) {
    case PLATFORM_IDS.FACEBOOK:
      return <Facebook className={sizeClass} />;
    case "twitter":
    case PLATFORM_IDS.X:
      return <Twitter className={sizeClass} />;
    case PLATFORM_IDS.LINKEDIN:
      return <Linkedin className={sizeClass} />;
    case PLATFORM_IDS.INSTAGRAM:
      return <Instagram className={sizeClass} />;
    case PLATFORM_IDS.THREADS:
      return (
        <Image
          src={PLATFORM_ICONS[PLATFORM_IDS.THREADS]}
          alt="Threads"
          width={imgSize}
          height={imgSize}
        />
      );
    case PLATFORM_IDS.REDDIT:
      return (
        <Image
          src={PLATFORM_ICONS[PLATFORM_IDS.REDDIT]}
          alt="Reddit"
          width={imgSize}
          height={imgSize}
        />
      );
    case PLATFORM_IDS.TIKTOK:
      return (
        <Image
          src={PLATFORM_ICONS[PLATFORM_IDS.TIKTOK]}
          alt="TikTok"
          width={imgSize}
          height={imgSize}
        />
      );
    default:
      return null;
  }
};

const getPlatformColor = (platform: string) => {
  switch (platform.toLowerCase()) {
    case PLATFORM_IDS.FACEBOOK:
      return "bg-blue-500";
    case "twitter":
    case PLATFORM_IDS.X:
      return "bg-sky-500";
    case PLATFORM_IDS.LINKEDIN:
      return "bg-blue-700";
    case PLATFORM_IDS.THREADS:
      return "bg-muted rounded-full border border-gray-300";
    case PLATFORM_IDS.REDDIT:
      return "bg-orange-500";
    case PLATFORM_IDS.TIKTOK:
      return "bg-black";
    case PLATFORM_IDS.INSTAGRAM:
      return "bg-gradient-to-r from-purple-500 to-pink-500";
    default:
      return "bg-gray-500";
  }
};

const getStatusBadge = (status: string, compact = false) => {
  const baseClasses = compact ? "text-xs px-1.5 py-0.5" : "";

  switch (status.toLowerCase()) {
    case "success":
    case "published":
    case "completed":
      return (
        <Badge
          variant="default"
          className={cn("bg-green-500 hover:bg-green-600", baseClasses)}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {compact ? "Published" : status}
        </Badge>
      );
    case "failed":
    case "error":
      return (
        <Badge variant="destructive" className={baseClasses}>
          <AlertCircle className="h-3 w-3 mr-1" />
          {compact ? "Failed" : status}
        </Badge>
      );
    case "pending":
    case "scheduled":
      return (
        <Badge variant="secondary" className={baseClasses}>
          <Clock className="h-3 w-3 mr-1" />
          {compact ? "Pending" : status}
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={baseClasses}>
          {status}
        </Badge>
      );
  }
};

const formatTime = (
  date: Date | string,
  viewerTimezone?: string
) => {
  const dateObj = new Date(date);
  const timezoneToUse = viewerTimezone || "America/New_York";

  return dateObj.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezoneToUse,
  });
};

const formatDateHeader = (date: Date | string, viewerTimezone?: string) => {
  const dateObj = new Date(date);
  const timezoneToUse = viewerTimezone || "America/New_York";

  return dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezoneToUse,
  });
};

const formatFullDate = (
  date: Date | string,
  viewerTimezone?: string
) => {
  const dateObj = new Date(date);
  const timezoneToUse = viewerTimezone || "America/New_York";

  return dateObj.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezoneToUse,
  });
};

const getDateKey = (date: Date | string, viewerTimezone?: string) => {
  const dateObj = new Date(date);
  const timezoneToUse = viewerTimezone || "America/New_York";

  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezoneToUse,
  });
};

const truncateText = (text: string, maxLength = 50) => {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength) + "…";
};

export function ScheduledPosts({ project }: Props) {
  const [selectedPost, setSelectedPost] = useState<PostWithProvider | null>(
    null
  );
  const [viewContentEdit, setViewContentEdit] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPastPosts, setShowPastPosts] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Track screen size for mobile sheet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Get viewer's timezone
  const viewerTimezone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : undefined;

  const queryClient = useQueryClient();
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery<PostWithProvider[]>({
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
      setSelectedPost(null);
    },
    onError: () => {
      toast.error("Failed to delete scheduled post");
    },
  });

  const onDeleteScheduledPost = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const yes = await confirm({
      title: "Do you want to delete this scheduled post?",
      description: "",
    });
    if (!yes) return;
    deleteScheduledPost.mutate(id);
  };

  // Get today's date key for comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = getDateKey(today, viewerTimezone);

  // Group posts by day
  const groupedPosts = posts.reduce(
    (acc, post) => {
      const key = getDateKey(post.date, viewerTimezone);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(post);
      return acc;
    },
    {} as Record<string, PostWithProvider[]>
  );

  // Sort days and posts within each day
  const sortedDays = Object.keys(groupedPosts).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  sortedDays.forEach((day) => {
    groupedPosts[day].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  });

  // Separate past days from today/future days
  const pastDays = sortedDays.filter((day) => {
    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate < today;
  });

  const futureDays = sortedDays.filter((day) => {
    const dayDate = new Date(day);
    dayDate.setHours(0, 0, 0, 0);
    return dayDate >= today;
  });

  // Count past posts
  const pastPostsCount = pastDays.reduce(
    (count, day) => count + groupedPosts[day].length,
    0
  );

  // Auto-select first upcoming post on large screens
  useEffect(() => {
    if (isMobile || isLoading || posts.length === 0) return;
    if (selectedPost) return; // Don't override user selection

    // Sort posts by date and find the first upcoming post
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const sortedPosts = [...posts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Find first post that's today or in the future
    const firstUpcoming = sortedPosts.find((post) => {
      const postDate = new Date(post.date);
      postDate.setHours(0, 0, 0, 0);
      return postDate >= now;
    });
    
    if (firstUpcoming) {
      setSelectedPost(firstUpcoming);
    } else if (sortedPosts.length > 0) {
      // If no upcoming posts, select the most recent past post
      setSelectedPost(sortedPosts[sortedPosts.length - 1]);
    }
  }, [isMobile, isLoading, posts, selectedPost]);

  const handleRowClick = (post: PostWithProvider) => {
    setSelectedPost(post);
    setIsEditMode(false);
  };

  const handleEditClick = (post: PostWithProvider, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPost(post);
    setIsEditMode(true);
    if (!viewContentEdit.includes(post.id)) {
      setViewContentEdit((prev) => [...prev, post.id]);
    }
  };

  const handlePreviewClick = (post: PostWithProvider, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPost(post);
    setIsEditMode(false);
    setViewContentEdit((prev) => prev.filter((id) => id !== post.id));
  };

  const renderPostPreview = (post: PostWithProvider) => {
    const commonProps = {
      post,
      viewContentEdit,
      setViewContentEdit,
    };

    switch (post.platform) {
      case PLATFORM_IDS.FACEBOOK:
        return <FacebookPostView {...commonProps} />;
      case PLATFORM_IDS.LINKEDIN:
        return <LinkedinPostView {...commonProps} />;
      case "twitter":
      case PLATFORM_IDS.X:
        return <XPostView {...commonProps} />;
      case PLATFORM_IDS.THREADS:
        return <ThreadsPostView {...commonProps} />;
      case PLATFORM_IDS.REDDIT:
        return <RedditPostView {...commonProps} />;
      case PLATFORM_IDS.INSTAGRAM:
        return <InstagramPostView {...commonProps} />;
      default:
        return (
          <div
            className="text-sm text-muted-foreground w-full"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {post.content}
          </div>
        );
    }
  };

  const renderScheduleRow = (
    post: PostWithProvider,
    options?: { dateLabel?: string; isToday?: boolean; showDateColumn?: boolean }
  ) => {
    const meta = post.meta as any;
    const hasCampaign = meta?.campaignId;
    const campaignName = meta?.campaignName;
    const { dateLabel, isToday, showDateColumn = true } = options || {};

    return (
      <div
        key={post.id}
        onClick={() => handleRowClick(post)}
        className={cn(
          "group flex items-center gap-3 py-3 cursor-pointer transition-all -my-0.5",
          "hover:bg-muted/50 rounded-r-lg",
          selectedPost?.id === post.id && "bg-muted"
        )}
      >
        {/* Date Column - Timeline style, hidden on very small screens */}
        {showDateColumn && (
          <div className="hidden sm:flex w-20 shrink-0 items-center justify-end pr-3 border-r border-muted-foreground/20">
            {dateLabel ? (
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}
              >
                {dateLabel}
              </span>
            ) : (
              <span className="w-full" />
            )}
          </div>
        )}

        {/* Platform Icon */}
        <div
          className={cn(
            "p-1.5 rounded-md text-white shrink-0",
            getPlatformColor(post.platform)
          )}
        >
          {getPlatformIcon(post.platform)}
        </div>

        {/* Time */}
        <div className="text-sm text-muted-foreground w-16 shrink-0">
          {formatTime(post.date, viewerTimezone)}
        </div>

        {/* Status */}
        <div className="shrink-0">{getStatusBadge(post.status, true)}</div>

        {/* Campaign Tag - Hidden on small screens */}
        {hasCampaign && (
          <Badge
            variant="outline"
            className="hidden sm:flex shrink-0 text-xs gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
          >
            <FolderOpen className="h-3 w-3" />
            {campaignName
              ? truncateText(campaignName, 15)
              : "Campaign"}
          </Badge>
        )}

        {/* Content Preview */}
        <div className="flex-1 min-w-0 text-sm text-foreground truncate">
          {truncateText(post.content, 50)}
        </div>

        {/* Hover Actions - Hidden on mobile (use click to open sheet instead) */}
        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => handlePreviewClick(post, e)}
            title="Preview"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => handleEditClick(post, e)}
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => onDeleteScheduledPost(post.id, e)}
            loading={deleteScheduledPost.isPending}
            title="Delete"
          >
            <Trash className="h-3.5 w-3.5 text-red-500" />
          </Button>
        </div>
      </div>
    );
  };

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
    <div className="space-y-4 -mx-4 sm:mx-0">
      {/* Stats - Right aligned, responsive */}
      {!isLoading && posts.length > 0 && (
        <div className="flex justify-end px-4 sm:px-0">
          <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{posts.length} posts</span>
            <span className="hidden sm:inline">•</span>
            <span>
              {
                posts.filter(
                  (p) => p.status === "success" || p.status === "published"
                ).length
              }{" "}
              published
            </span>
            <span className="hidden sm:inline">•</span>
            <span>
              {
                posts.filter(
                  (p) => p.status === "pending" || p.status === "scheduled"
                ).length
              }{" "}
              pending
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex gap-4">
        {/* Schedule List */}
        <div
          className={cn(
            "flex-1 min-w-0 transition-all",
            selectedPost && "lg:max-w-[70%]"
          )}
        >
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
            <div className="space-y-4">
              {/* Past Posts Collapse Toggle */}
              {pastDays.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPastPosts(!showPastPosts)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/50 hover:bg-muted rounded-lg transition-colors border border-dashed border-muted-foreground/30"
                  >
                    {showPastPosts ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <History className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {showPastPosts ? "Hide" : "Show"} Past Posts
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {pastPostsCount}
                    </Badge>
                  </button>

                  {/* Past Posts List - Timeline style */}
                  {showPastPosts && (
                    <div className="opacity-70">
                      {pastDays.map((day) => {
                        const dayPosts = groupedPosts[day];
                        const firstPost = dayPosts[0];
                        const dateLabel = formatDateHeader(firstPost.date, viewerTimezone);

                        return dayPosts.map((post, index) =>
                          renderScheduleRow(post, {
                            dateLabel: index === 0 ? dateLabel : undefined,
                            isToday: false,
                            showDateColumn: true,
                          })
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Today & Future Posts - Timeline style */}
              {futureDays.map((day) => {
                const dayPosts = groupedPosts[day];
                const firstPost = dayPosts[0];
                const isToday = day === todayKey;
                const dateLabel = isToday ? "Today" : formatDateHeader(firstPost.date, viewerTimezone);

                return dayPosts.map((post, index) =>
                  renderScheduleRow(post, {
                    dateLabel: index === 0 ? dateLabel : undefined,
                    isToday,
                    showDateColumn: true,
                  })
                );
              })}

              {/* Empty state for no future posts */}
              {futureDays.length === 0 && pastDays.length > 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">No upcoming posts</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      All {pastPostsCount} posts are in the past
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Preview Drawer - Desktop inline, Mobile sheet */}
        {selectedPost && (
          <>
            {/* Desktop: Inline Preview Panel */}
            <div className="hidden lg:block w-[30%] min-w-[350px] sticky top-4 self-start">
              <Card className="h-[calc(100vh-200px)] overflow-hidden flex flex-col">
                <CardHeader className="pb-3 shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "p-1.5 rounded-md text-white",
                          getPlatformColor(selectedPost.platform)
                        )}
                      >
                        {getPlatformIcon(selectedPost.platform, "md")}
                      </div>
                      <div>
                        <CardTitle className="text-base capitalize">
                          {selectedPost.platform}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatFullDate(selectedPost.date, viewerTimezone)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusBadge(selectedPost.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSelectedPost(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(selectedPost.meta as any)?.campaignName && (
                    <Badge
                      variant="outline"
                      className="w-fit mt-2 gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                    >
                      <FolderOpen className="h-3 w-3" />
                      {(selectedPost.meta as any).campaignName}
                    </Badge>
                  )}
                  {selectedPost.error && (
                    <div className="px-2 py-1.5 bg-destructive/10 border border-destructive/20 rounded-md mt-2">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-destructive/90 line-clamp-2">
                          {selectedPost.error}
                        </p>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-3 pt-0">
                  {renderPostPreview(selectedPost)}
                </CardContent>
                <div className="p-3 border-t shrink-0 flex gap-2">
                  <Button
                    variant={isEditMode ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setIsEditMode(true);
                      if (!viewContentEdit.includes(selectedPost.id)) {
                        setViewContentEdit((prev) => [
                          ...prev,
                          selectedPost.id,
                        ]);
                      }
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteScheduledPost(selectedPost.id)}
                    loading={deleteScheduledPost.isPending}
                  >
                    <Trash className="h-3.5 w-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </Card>
            </div>

            {/* Mobile: Sheet - Only render on mobile to avoid overlay on desktop */}
            {isMobile && (
              <Sheet
                open={!!selectedPost}
                onOpenChange={(open) => !open && setSelectedPost(null)}
              >
                <SheetContent className="w-full sm:max-w-md overflow-auto">
                <SheetHeader>
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "p-1.5 rounded-md text-white",
                        getPlatformColor(selectedPost.platform)
                      )}
                    >
                      {getPlatformIcon(selectedPost.platform, "md")}
                    </div>
                    <div>
                      <SheetTitle className="text-base capitalize">
                        {selectedPost.platform}
                      </SheetTitle>
                      <SheetDescription className="text-xs">
                        {formatFullDate(selectedPost.date, viewerTimezone)}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedPost.status)}
                    {(selectedPost.meta as any)?.campaignName && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      >
                        <FolderOpen className="h-3 w-3" />
                        {(selectedPost.meta as any).campaignName}
                      </Badge>
                    )}
                  </div>
                  {selectedPost.error && (
                    <div className="px-2 py-1.5 bg-destructive/10 border border-destructive/20 rounded-md">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-destructive/90">
                          {selectedPost.error}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="border rounded-lg p-2">
                    {renderPostPreview(selectedPost)}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={isEditMode ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setIsEditMode(true);
                        if (!viewContentEdit.includes(selectedPost.id)) {
                          setViewContentEdit((prev) => [
                            ...prev,
                            selectedPost.id,
                          ]);
                        }
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteScheduledPost(selectedPost.id)}
                      loading={deleteScheduledPost.isPending}
                    >
                      <Trash className="h-3.5 w-3.5 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </div>
                </SheetContent>
              </Sheet>
            )}
          </>
        )}
      </div>
    </div>
  );
}
