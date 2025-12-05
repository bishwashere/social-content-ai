"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function ScheduledPostsPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-6 w-6 text-indigo-600" />
            <h1 className="text-4xl font-bold">Scheduled Posts</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Schedule content to be posted automatically at specific times
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Schedule posts to be automatically published at your chosen date and time across connected platforms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Schedule posts for specific dates and times</li>
                <li>Multi-platform scheduling in one action</li>
                <li>Media attachment support (images, videos)</li>
                <li>Post status tracking (pending, processing, success, failed)</li>
                <li>Failed post retry mechanism</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Create or select content to schedule</li>
                <li>Choose target platforms and date/time</li>
                <li>Optionally attach media files</li>
                <li>Post is queued for automatic publishing</li>
                <li>System posts at scheduled time using connected OAuth credentials</li>
                <li>Status updates automatically after posting</li>
              </ol>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

