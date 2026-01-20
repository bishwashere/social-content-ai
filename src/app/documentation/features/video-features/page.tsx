"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Play, Film } from "lucide-react";

export default function VideoFeaturesPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Video className="h-6 w-6 text-pink-600" />
          <h1 className="text-4xl font-bold">Video Features</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Create engaging videos quickly with AI assistance
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Video Maker</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Create videos instantly without setting up a project first. Perfect for quick content creation.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>3-step process: Select Template → Enter Hook → Upload Demo Video</li>
              <li>No project setup required</li>
              <li>Accessible from dashboard and sidebar</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Video Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Choose from viral video templates optimized for engagement.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Central hub for all your videos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>View all generated videos in one place</li>
              <li>Track processing status (Pending/Completed)</li>
              <li>Download completed videos</li>
              <li>View videos from campaigns and standalone creation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create videos directly within campaign days. Videos are linked to specific campaign days and can be accessed from both the campaign planner and My Videos.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
