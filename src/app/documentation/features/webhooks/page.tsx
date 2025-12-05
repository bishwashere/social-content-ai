"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Webhook } from "lucide-react";

export default function WebhooksPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Webhook className="h-6 w-6 text-purple-600" />
            <h1 className="text-4xl font-bold">Webhook Integration</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Receive blog posts via webhooks for external publishing
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Endpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Blog News campaigns can send generated blog posts to your webhook endpoint at:
              </p>
              <code className="block bg-muted p-2 rounded text-sm">
                POST https://www.nextpostai.com/ideas/receive
              </code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payload Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                The webhook receives a JSON payload with the following structure:
              </p>
              <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`{
  "day": 1,
  "blog": {
    "title": "Generated Blog Title",
    "content": "MDX formatted article content...",
    "tags": ["tag1", "tag2", "tag3"],
    "sourceArticle": {
      "title": "Original Post Title",
      "content": "Original post content",
      "source": "reddit" | "hackernews",
      "url": "https://...",
      "articleId": "unique-id"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li><strong>Method:</strong> POST</li>
                <li><strong>Content-Type:</strong> application/json</li>
                <li><strong>Timeout:</strong> 10 seconds</li>
                <li><strong>Success Response:</strong> HTTP 200-299 status codes</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Webhook URLs should use HTTPS for secure transmission</li>
                <li>Consider implementing authentication (API keys, tokens) in your webhook endpoint</li>
                <li>Validate incoming payload structure before processing</li>
                <li>Webhook failures don't prevent blog generation - blogs are saved regardless</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retry Mechanism</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                If a webhook fails, you can manually retry sending:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Webhook status is displayed in the blog view</li>
                <li>&quot;Retry Webhook&quot; button available for failed webhooks</li>
                <li>Retry updates the webhook status automatically</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

