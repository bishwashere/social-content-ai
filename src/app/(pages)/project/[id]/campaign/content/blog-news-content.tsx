"use client";

import { useBlogFromScheduledPost, useRetryWebhook } from "@/backend-apis/campaign-planner/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import Markdown from "react-markdown";
import { toast } from "sonner";

// Component to display blog from ScheduledPost (where Python saves it)
export function BlogNewsDayContent({
  campaignId,
  day,
  retryWebhook
}: {
  campaignId: string;
  day: number;
  retryWebhook: ReturnType<typeof useRetryWebhook>;
}) {
  const { data: scheduledPostData, isLoading: isLoadingBlog } = useBlogFromScheduledPost(campaignId, day);

  const blog = scheduledPostData?.blog;
  const step1Completed = scheduledPostData?.step1Completed || false;
  const step2Completed = scheduledPostData?.step2Completed || false;
  const step3Completed = scheduledPostData?.step3Completed || false;
  const step4Completed = scheduledPostData?.step4Completed || false;
  const allStepsComplete = scheduledPostData?.allStepsComplete || false;
  const articleUrl = scheduledPostData?.articleUrl;
  const webhookSent = scheduledPostData?.webhookSent;

  if (!step1Completed || !step2Completed || !blog) {
    return (
      <div className="col-span-2 flex items-center justify-center py-12">
        {isLoadingBlog ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-muted-foreground">Loading blog...</p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            {step1Completed && !step2Completed
              ? "Step 1 complete. Generating blog (Step 2)..."
              : !step1Completed
              ? "Fetching article (Step 1)..."
              : "No blog generated yet. Click Generate to create it with AI."}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="col-span-2 space-y-4">
      <Card className="rounded-lg border">
        <CardHeader>
          <CardTitle>{blog.title || "Untitled Blog"}</CardTitle>
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {blog.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <Markdown>{blog.content || ""}</Markdown>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground flex flex-col gap-1">
            {allStepsComplete && webhookSent !== undefined && (
              <span className={webhookSent ? "text-green-600" : "text-red-600"}>
                {webhookSent ? "✓ Webhook sent" : "✗ Webhook failed"}
              </span>
            )}
            {allStepsComplete && articleUrl && (
              <a
                href={articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-xs break-all"
              >
                {articleUrl}
              </a>
            )}
            {!allStepsComplete && (
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant={step1Completed ? "default" : "outline"} className={step1Completed ? "bg-green-500" : ""}>
                  Step 1 {step1Completed ? "✓" : "..."}
                </Badge>
                <Badge variant={step2Completed ? "default" : "outline"} className={step2Completed ? "bg-green-500" : ""}>
                  Step 2 {step2Completed ? "✓" : "..."}
                </Badge>
                <Badge variant={step3Completed ? "default" : "outline"} className={step3Completed ? "bg-green-500" : ""}>
                  Step 3 {step3Completed ? "✓" : "..."}
                </Badge>
                <Badge variant={step4Completed ? "default" : "outline"} className={step4Completed ? "bg-green-500" : ""}>
                  Step 4 {step4Completed ? "✓" : "..."}
                </Badge>
              </div>
            )}
          </div>
          {allStepsComplete && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const { getBlogNewsMetadataFromCampaign } = await import("@/backend-apis/campaign-planner/blog-news");
                const metadata = await getBlogNewsMetadataFromCampaign(campaignId);
                const finalWebhookUrl = metadata?.webhook || "";

                if (!finalWebhookUrl) {
                  toast.error("Webhook URL not found. Please configure the webhook in campaign settings.");
                  return;
                }
                retryWebhook.mutate({
                  webhook: finalWebhookUrl,
                  blog: {
                    title: blog.title,
                    content: blog.content,
                    tags: blog.tags,
                    sourceArticle: blog.sourceArticle,
                  },
                  day: day,
                  campaignId: campaignId,
                });
              }}
              loading={retryWebhook.isPending}
              disabled={retryWebhook.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resend Webhook
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
