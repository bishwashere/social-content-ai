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

        {/* Display project name and views */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <PlayIcon className="h-3 w-3 text-gray-600 shrink-0" />
          <span className="text-xs text-gray-600">{post.views || 1}</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-800 truncate">
            {post.project?.name || "Unknown"}
          </span>
          <img
            src={`/${post.platform}.svg`}
            alt=""
            className="size-3 object-contain object-center shrink-0"
          />
        </div>
      </CardContent>
    </Card>
  );
};
