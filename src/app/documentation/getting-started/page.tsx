"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Rocket, PlayCircle, BookOpen, CheckCircle } from "lucide-react";

export default function GettingStartedPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Rocket className="h-6 w-6 text-orange-600" />
          <h1 className="text-4xl font-bold">Getting Started</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Learn how to get started with NextPost AI
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Tours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Interactive guided tours help you discover features:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Dashboard Tour:</strong> Overview of main features and navigation</li>
              <li><strong>Navigation Tour:</strong> Learn about sidebar and top navigation</li>
              <li><strong>Feature Tips:</strong> Contextual help on first use</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>First Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Create your first project</li>
              <li>Connect your social media accounts</li>
              <li>Generate your first post with Quick Generate</li>
              <li>Create a campaign to plan content ahead</li>
              <li>Schedule posts to stay consistent</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Get Started Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              The Get Started Guide appears for new users and helps you:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Connect social media accounts</li>
              <li>Create your first post</li>
              <li>Set up your first campaign</li>
              <li>Schedule posts for consistency</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
