"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRetryWebhook } from "@/backend-apis/campaign-planner/hooks";
import { getBlogWebhookInfo } from "@/server-actions/get-blog-webhook-info";
import { toast } from "sonner";

interface BlogResendWebhookButtonProps {
  blogTitle: string;
  blogContent: string;
  blogTags?: string[];
}

export function BlogResendWebhookButton({
  blogTitle,
  blogContent,
  blogTags = [],
}: BlogResendWebhookButtonProps) {
  const [webhookInfo, setWebhookInfo] = useState<{
    webhook: string;
    campaignId: string;
    day: number;
    sourceArticle?: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const retryWebhook = useRetryWebhook();

  useEffect(() => {
    async function fetchWebhookInfo() {
      try {
        // Get campaign info from server
        const result = await getBlogWebhookInfo(blogTitle);
        
        if (!result.success || result.goal !== "Blog News") {
          setLoading(false);
          return;
        }

        // Get webhook URL from localStorage (temporary solution)
        const stored = localStorage.getItem("blogNewsMetadata");
        if (!stored) {
          setLoading(false);
          return;
        }

        try {
          const blogNewsMetadata = JSON.parse(stored) as Record<
            string,
            { topics: string[]; angle: string; webhook: string }
          >;

          const metadata = blogNewsMetadata[result.campaignId];
          if (!metadata || !metadata.webhook) {
            setLoading(false);
            return;
          }

          setWebhookInfo({
            webhook: metadata.webhook,
            campaignId: result.campaignId,
            day: result.day,
            sourceArticle: result.blog.sourceArticle,
          });
        } catch (e) {
          console.error("Error parsing blog news metadata:", e);
        }
      } catch (error) {
        console.error("Error fetching webhook info:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchWebhookInfo();
  }, [blogTitle]);

  if (loading) {
    return null;
  }

  if (!webhookInfo) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        retryWebhook.mutate({
          webhook: webhookInfo.webhook,
          blog: {
            title: blogTitle,
            content: blogContent,
            tags: blogTags,
            sourceArticle: webhookInfo.sourceArticle,
          },
          day: webhookInfo.day,
          campaignId: webhookInfo.campaignId,
        });
      }}
      loading={retryWebhook.isPending}
      disabled={retryWebhook.isPending}
      className="mt-4"
    >
      <RefreshCw className="h-4 w-4 mr-2" />
      Resend Webhook
    </Button>
  );
}

