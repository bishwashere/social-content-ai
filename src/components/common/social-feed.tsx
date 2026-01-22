"use client";
import { useGetWall } from "@/backend-apis/wall/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { PlayIcon } from "@heroicons/react/solid"; // Import the play icon from Heroicons
import { WallResponsePaginated } from "@/backend-apis/wall/types";
import { useEffect, useState, useRef } from "react";
import { viewWall } from "@/server-actions/view-wall";
import Image from "next/image";
import { Facebook, Twitter, Linkedin } from "lucide-react";
import { NewsTrendingSection } from "@/app/(pages)/project/_components/news-trending";

// Social media engagement icons - Subtle, non-interactive styling
const LikeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path>
  </svg>
);

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M21.99 4c0-1.1-.89-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"></path>
  </svg>
);

const RepostIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.385-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.336-.75-.75-.75z"></path>
  </svg>
);

const ShareIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"></path>
  </svg>
);

// LinkedIn specific icons - Subtle styling
const LinkedinLikeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M12.91 7l-2.25-2.57a8.21 8.21 0 01-1.5-2.55L9 1.37A2.08 2.08 0 007 0a2.08 2.08 0 00-2.06 2.08v1.17a5.81 5.81 0 00.31 1.89l.28.86H2.38A1.47 1.47 0 001 7.47a1.45 1.45 0 00.64 1.21 1.48 1.48 0 00-.37 2.06 1.54 1.54 0 00.62.51h.05a1.6 1.6 0 00-.19.71A1.47 1.47 0 003 13.42v.1A1.46 1.46 0 004.4 15h4.83a5.61 5.61 0 002.48-.58l1-.42H14V7zM12 12.11l-1.19.52a3.59 3.59 0 01-1.58.37H5.1a.55.55 0 01-.53-.4l-.14-.48-.49-.21a.56.56 0 01-.34-.6l.09-.56-.42-.42a.56.56 0 01-.09-.68L3.55 9l-.4-.61A.28.28 0 013.3 8h5L7.14 4.51a4.15 4.15 0 01-.2-1.26V2.08A.09.09 0 017 2a.11.11 0 01.08 0l.18.51a10 10 0 001.9 3.24l2.84 3z"></path>
  </svg>
);

const LinkedinCommentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M5 8h5v1H5zm11-.5v.08a6 6 0 01-2.75 5L8 16v-3H5.5A5.51 5.51 0 010 7.5 5.62 5.62 0 015.74 2h4.76A5.5 5.5 0 0116 7.5zm-2 0A3.5 3.5 0 0010.5 4H5.74A3.62 3.62 0 002 7.5 3.53 3.53 0 005.5 11H10v1.33l2.17-1.39A4 4 0 0014 7.58zM5 7h6V6H5z"></path>
  </svg>
);

const LinkedinRepostIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M4 10H2V5c0-1.66 1.34-3 3-3h3.85L7.42 0h2.44L12 3 9.86 6H7.42l1.43-2H5c-.55 0-1 .45-1 1v5zm8-4v5c0 .55-.45 1-1 1H7.15l1.43-2H6.14L4 13l2.14 3h2.44l-1.43-2H11c1.66 0 3-1.34 3-3V6h-2z"></path>
  </svg>
);

const LinkedinSendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5 text-gray-400 dark:text-gray-500 opacity-60">
    <path d="M14 2L0 6.67l5 2.64 5.67-3.98L6.7 11l2.63 5L14 2z"></path>
  </svg>
);

// Platform icon and color functions (matching scheduled posts design)
const getPlatformIcon = (platform: string) => {
  const platformLower = platform.toLowerCase();
  switch (platformLower) {
    case "facebook":
      return <Facebook className="h-4 w-4" />;
    case "twitter":
    case "x":
      return <Twitter className="h-4 w-4" />;
    case "linkedin":
      return <Linkedin className="h-4 w-4" />;
    case "threads":
      return <Image src="/threads.svg" alt="Threads" width={16} height={16} className="dark:brightness-0 dark:invert" />;
    case "instagram":
      return <Image src="/instagram.svg" alt="Instagram" width={16} height={16} className="dark:brightness-0 dark:invert" />;
    case "reddit":
      return <Image src="/reddit.svg" alt="Reddit" width={16} height={16} className="dark:brightness-0 dark:invert" />;
    case "tiktok":
      return <Image src="/tiktok.svg" alt="TikTok" width={16} height={16} className="dark:brightness-0 dark:invert" />;
    default:
      // Fallback to SVG if available
      try {
        return <Image src={`/${platformLower}.svg`} alt={platform} width={16} height={16} className="dark:brightness-0 dark:invert" />;
      } catch {
        return null;
      }
  }
};

const getPlatformColor = (platform: string) => {
  const platformLower = platform.toLowerCase();
  switch (platformLower) {
    case "facebook":
      return "bg-blue-500";
    case "twitter":
    case "x":
      return "bg-sky-500";
    case "linkedin":
      return "bg-blue-700";
    case "threads":
      return "bg-muted rounded-full border border-gray-300";
    case "instagram":
      return "bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500";
    case "reddit":
      return "bg-orange-500";
    case "tiktok":
      return "bg-black";
    default:
      return "bg-gray-500";
  }
};

export default function SocialFeed() {
  const wall = useGetWall({ page: 1 });

  // Custom function to format date to relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      // Less than a minute
      if (diffInSeconds < 60) {
        return "now";
      }

      // Less than an hour
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m`;
      }

      // Less than a day
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h`;
      }

      // Less than a week
      if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d`;
      }

      // Less than a month
      if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks}w`;
      }

      // Less than a year
      if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        return `${months}mo`;
      }

      // More than a year
      const years = Math.floor(diffInSeconds / 31536000);
      return `${years}y`;
    } catch {
      return "unknown";
    }
  };

  return (
    <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto items-center justify-center py-8 px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">For you</h2>
      </div>

      {/* News Trending Section - appears before posts */}
      <NewsTrendingSection />

      {wall.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="pt-0">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !wall?.data?.pages || wall?.data?.pages?.flatMap((page) => page.posts).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No posts found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {wall?.data?.pages
              ?.flatMap((page) => page.posts)
              .map((post) => {
                return (
                  <WallComp
                    key={post.id}
                    post={{
                      ...post,
                      createdAt: formatRelativeTime(post.createdAt.toString()) as any,
                    }}
                  />
                );
              })}
          </div>

          {wall.data?.pages?.[wall?.data?.pages?.length - 1]?.pagination
            ?.hasMore && (
              <div className="w-full flex items-center justify-center mt-6">
                <Button
                  className="w-32"
                  onClick={() => wall.fetchNextPage()}
                  disabled={wall.isFetchingNextPage}
                >
                  {wall.isFetchingNextPage ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
        </>
      )}
    </div>
  );
}

const WallComp = ({
  post,
}: {
  post: WallResponsePaginated["posts"][number];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    viewWall(post.id)
  }, [post.id]);

  useEffect(() => {
    // Check if content exceeds 5 lines by comparing with measurement div
    const checkContentHeight = () => {
      if (contentRef.current && measureRef.current) {
        const lineHeight = parseFloat(window.getComputedStyle(contentRef.current).lineHeight) || 20;
        const maxHeight = lineHeight * 5;
        const fullHeight = measureRef.current.scrollHeight;
        setShowExpandButton(fullHeight > maxHeight);
      }
    };

    // Use setTimeout to ensure DOM is ready after render
    const timer = setTimeout(checkContentHeight, 0);
    return () => clearTimeout(timer);
  }, [post.content]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      key={post.id}
      className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col h-full"
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-8 w-8 border shrink-0">
            <AvatarImage src={post.user?.avatarUrl} alt={post.user?.name} />
            <AvatarFallback className="text-xs">
              {post.user?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-medium text-sm truncate">{post.project?.name || "Unknown"}</span>
              <span className="text-muted-foreground text-xs shrink-0">
                {post.createdAt?.toString()}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-0 px-4 pb-4">
        <div className="text-sm whitespace-pre-line relative flex-1">
          {/* Hidden div to measure full content height */}
          <div
            ref={measureRef}
            className="text-sm whitespace-pre-line absolute opacity-0 pointer-events-none invisible"
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              zIndex: -1
            }}
          >
            {post.content}
          </div>
          <div
            ref={contentRef}
            className={isExpanded ? "" : "line-clamp-5"}
          >
            {post.content}
          </div>
          {showExpandButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1 font-medium"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>

        {/* Engagement Metrics - Subtle, non-interactive display */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
          {/* Reactions/Engagement count row */}
          <div className="flex items-center gap-2 opacity-60">
            {post.platform === "facebook" && (
              <>
                <img src="/facebook-reactions.png" className="w-7 h-auto dark:brightness-0 dark:invert opacity-70" alt="Reactions" />
                <span className="text-xs text-muted-foreground">534</span>
              </>
            )}
            {post.platform === "linkedin" && (
              <>
                <img src="/linkedin-reactions.png" className="w-8 h-auto dark:brightness-0 dark:invert opacity-70" alt="Reactions" />
                <span className="text-xs text-muted-foreground">534</span>
              </>
            )}
            {post.platform === "threads" && (
              <div className="flex items-center gap-3 w-full">
                <div className="flex items-center gap-1">
                  <LikeIcon />
                  <span className="text-xs text-muted-foreground">16K</span>
                </div>
                <div className="flex items-center gap-1">
                  <CommentIcon />
                  <span className="text-xs text-muted-foreground">880</span>
                </div>
                <div className="flex items-center gap-1">
                  <RepostIcon />
                  <span className="text-xs text-muted-foreground">3.4K</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShareIcon />
                  <span className="text-xs text-muted-foreground">1.2K</span>
                </div>
              </div>
            )}
            {!["facebook", "linkedin", "threads"].includes(post.platform?.toLowerCase() || "") && 
             post.platform?.toLowerCase() !== "twitter" && 
             post.platform?.toLowerCase() !== "x" && (
              <div className="flex items-center gap-2">
                <PlayIcon className="h-3 w-3 text-gray-400 shrink-0" />
                <span className="text-xs text-gray-400">{post.views || 1}</span>
              </div>
            )}
          </div>

          {/* Action buttons row - Subtle, non-interactive */}
          <div className="flex items-center justify-around pt-1.5 border-t border-gray-100 dark:border-gray-800 opacity-50">
            {post.platform === "facebook" && (
              <>
                <div className="flex items-center justify-center gap-1.5">
                  <Image src="/facebook-like.png" width={16} height={16} alt="Like" className="dark:brightness-0 dark:invert opacity-60" />
                  <p className="text-xs text-muted-foreground font-normal">Like</p>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Image src="/facebook-comment.png" width={16} height={16} alt="Comment" className="dark:brightness-0 dark:invert opacity-60" />
                  <p className="text-xs text-muted-foreground font-normal">Comment</p>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Image src="/facebook-share.png" width={16} height={16} alt="Share" className="dark:brightness-0 dark:invert opacity-60" />
                  <p className="text-xs text-muted-foreground font-normal">Repost</p>
                </div>
              </>
            )}
            {post.platform === "linkedin" && (
              <>
                <div className="flex items-center justify-center gap-1">
                  <LinkedinLikeIcon />
                  <p className="text-xs text-muted-foreground font-normal">Like</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <LinkedinCommentIcon />
                  <p className="text-xs text-muted-foreground font-normal">Comment</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <LinkedinRepostIcon />
                  <p className="text-xs text-muted-foreground font-normal">Repost</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <LinkedinSendIcon />
                  <p className="text-xs text-muted-foreground font-normal">Send</p>
                </div>
              </>
            )}
            {(post.platform === "twitter" || post.platform === "x") && (
              <>
                <div className="flex items-center justify-center gap-1">
                  <CommentIcon />
                  <p className="text-xs text-muted-foreground">880</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <RepostIcon />
                  <p className="text-xs text-muted-foreground">3.4K</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <LikeIcon />
                  <p className="text-xs text-muted-foreground">16K</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <ShareIcon />
                </div>
              </>
            )}
            {post.platform === "threads" && (
              <>
                <div className="flex items-center justify-center gap-1">
                  <LikeIcon />
                  <p className="text-xs text-muted-foreground">16K</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <CommentIcon />
                  <p className="text-xs text-muted-foreground">880</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <RepostIcon />
                  <p className="text-xs text-muted-foreground">3.4K</p>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <ShareIcon />
                  <p className="text-xs text-muted-foreground">1.2K</p>
                </div>
              </>
            )}
            {!["facebook", "linkedin", "twitter", "x", "threads"].includes(post.platform?.toLowerCase() || "") && (
              <div className="flex items-center gap-2">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-800 truncate">
                  {post.project?.name || "Unknown"}
                </span>
                <div
                  className={`p-1.5 rounded-full text-white shrink-0 ${getPlatformColor(
                    post.platform || ""
                  )}`}
                >
                  {getPlatformIcon(post.platform || "")}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
