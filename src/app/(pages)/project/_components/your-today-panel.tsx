"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGetYourToday } from "@/backend-apis/your-today/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export function YourTodayPanel() {
  const router = useRouter();
  const { data: actionItems = [], isLoading, error } = useGetYourToday();

  const handleAction = (item: typeof actionItems[0]) => {
    switch (item.action) {
      case "view_failed_posts":
        if (item.projectId) {
          router.push(`/project/${item.projectId}?tab=scheduled`);
        }
        break;
      case "generate_campaign_content":
        if (item.projectId) {
          router.push(`/project/${item.projectId}?tab=campaign`);
        }
        break;
      case "schedule_post":
        // Navigate to first project or show project selection
        router.push("/project");
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your Today</h2>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your Today</h2>
        <Card>
          <CardHeader>
            <CardTitle>Unable to load your today items</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "An error occurred"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (actionItems.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-bold mb-4">Your Today</h2>
        <Card>
          <CardHeader>
            <CardTitle>All caught up! 🎉</CardTitle>
            <CardDescription>
              You don&apos;t have any urgent tasks right now. Everything looks good!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold mb-4">Your Today</h2>
      <div className="grid gap-4">
        {actionItems.map((item, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{item.icon}</span>
                {item.title}
              </CardTitle>
              {item.projectName && (
                <CardDescription>
                  Project: {item.projectName}
                  {item.campaignName && ` • Campaign: ${item.campaignName}`}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => handleAction(item)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Take Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

