"use client";
import { useGetWall } from "@/backend-apis/wall/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { PlayIcon } from "@heroicons/react/solid"; // Import the play icon from Heroicons
import { WallResponsePaginated } from "@/backend-apis/wall/types";
import { useEffect } from "react";
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
      <div className="flex items-center justify-center p-3 border-b">
        <h2 className="text-base font-medium">For you</h2>
      </div>

      <ScrollArea className="h-[70vh]">
        <div className="divide-y">
          {wall.isLoading ? (
            <div className="p-6 space-y-6 items-center justify-center">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            wall?.data?.pages
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
              })
          )}

          {wall.data?.pages?.[wall?.data?.pages?.length - 1]?.pagination
            ?.hasMore && (
              <div className="w-full flex items-center justify-center ">
                <Button
                  className="w-32 my-4"
                  onClick={() => wall.fetchNextPage()}
                  disabled={wall.isFetchingNextPage}
                >
                  Load More
                </Button>
              </div>
            )}
        </div>
      </ScrollArea>
    </div>
  );
}

const WallComp = ({
  post,
}: {
  post: WallResponsePaginated["posts"][number];
}) => {
  useEffect(() => {
    // const fn = async () => {
    //   const isViewed =
    //     sessionStorage.getItem(`wall:viewed:${post.id}`) === "true";

    //   if (!isViewed) {
    //     const res = await viewWall(post.id);
    //     if (res) {
    //       sessionStorage.setItem(`wall:viewed:${post.id}`, "true");
    //     }
    //   }
    // };
    // fn();
    viewWall(post.id)
  }, [post.id]);

  return (
    <Card
      key={post.id}
      className="rounded-none border-0 shadow-none border-b border-gray-200"
    >
      <CardHeader className="flex flex-row items-start space-y-0 p-4 pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={post.user?.avatarUrl} alt={post.user?.name} />
            <AvatarFallback>
              {post.user?.name?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm">{post.user?.name || "Unknown"}</span>
              <span className="text-muted-foreground text-xs">
                {post.createdAt?.toString()}
              </span>
            </div>
            <CardContent className="p-0 pt-1 text-sm whitespace-pre-line">
              {post.content}
            </CardContent>

            {/* Display project name and views */}
            <div className="flex items-center gap-3">
              {/* Assuming you have a views property on the post */}
              <PlayIcon className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-gray-600">{post.views || 1}</span>
              <span className="bg-gray-100 p-1 rounded-lg text-sm text-gray-800">
                {post.project?.name || "Unknown"}
              </span>
              <img
                src={`/${post.platform}.svg`}
                alt=""
                className="size-4 object-contain object-center ml-2"
              />
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
};
