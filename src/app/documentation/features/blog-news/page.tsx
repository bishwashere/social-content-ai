"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function BlogNewsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-6 w-6 text-green-600" />
            <h1 className="text-4xl font-bold">Blog News Campaigns</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Fully automated blog generation from trending news and articles
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Blog News campaigns automatically fetch trending articles and generate blog posts with your chosen perspective and angle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Select topics and choose a content angle (Industry Shift, Trend Watch, etc.)</li>
                <li>Configure webhook URL so blogs publish automatically to your CMS or site</li>
                <li>Campaign generates timeline with daily blog posts</li>
                <li>Each day, system fetches relevant articles from news sources</li>
                <li>AI generates blog post with your chosen angle</li>
                <li>Blog is sent to webhook and published automatically</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duplicate Prevention</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Our system prevents using the same article twice in a campaign:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Articles are tracked by unique identifiers</li>
                <li>If an article was used previously, the system automatically selects the next available article</li>
                <li>Runs the same fully automated pipeline for every scheduled day and system retry</li>
                <li>Ensures fresh, unique content for each day</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhook Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Blog News campaigns support webhook integration for automatic publishing:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Configure webhook URL in campaign settings</li>
                <li>Generated blogs are automatically sent to your webhook endpoint</li>
                <li>Webhook payload includes title, content, tags, and source article information</li>
                <li>Retry mechanism available if webhook fails</li>
                <li>Webhook status is tracked and displayed in the UI</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

