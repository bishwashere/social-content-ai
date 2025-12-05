"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";

export default function QuickGeneratePage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-6 w-6 text-yellow-600" />
            <h1 className="text-4xl font-bold">Quick Generate</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Instantly generate content for multiple social media platforms
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Quick Generate allows you to create platform-optimized content instantly. Simply provide a prompt, and our AI generates tailored content for each selected platform.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Multi-platform content generation in one click</li>
                <li>Platform-specific character limits and formatting</li>
                <li>AI-powered content optimization for each platform</li>
                <li>Support for all connected social media platforms</li>
                <li>Content history and editing capabilities</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Enter your content prompt or idea</li>
                <li>Select target platforms (Twitter, LinkedIn, Facebook, etc.)</li>
                <li>AI generates platform-optimized content for each selection</li>
                <li>Review, edit, and customize generated content</li>
                <li>Save to history or schedule for posting</li>
              </ol>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

