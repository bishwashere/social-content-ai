"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook, Link2 } from "lucide-react";
import Link from "next/link";

export default function WebhooksPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Webhook className="h-6 w-6 text-purple-600" />
          <h1 className="text-4xl font-bold">Webhooks</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Receive blog posts via webhooks for external publishing
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Webhooks allow NextPost AI to send generated blog posts to your external publishing platform automatically.
            </p>
            <p className="text-sm text-muted-foreground">
              This is primarily used with the Blog News automation feature to publish blogs to your CMS or blog platform.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Configure webhook URL in Blog News campaign settings</li>
              <li>Blog is generated from trending articles</li>
              <li>Blog is sent to your webhook URL via POST request</li>
              <li>Your platform receives the blog and publishes it</li>
              <li>Social posts are created linking to the published blog</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Webhook Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The webhook sends a JSON payload containing:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Blog title</li>
              <li>Blog content</li>
              <li>Tags</li>
              <li>Source article information</li>
              <li>Campaign day and metadata</li>
            </ul>
          </CardContent>
        </Card>

        <div className="mt-4">
          <Link href="/documentation/features/blog-news" className="text-sm text-primary hover:underline">
            Learn more about Blog News automation →
          </Link>
        </div>
      </div>
    </div>
  );
}
