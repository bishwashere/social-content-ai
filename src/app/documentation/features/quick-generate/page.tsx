"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, MessageSquare, Image, Link2 } from "lucide-react";

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
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-yellow-600" />
                Dashboard Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Use the in-dashboard chat to generate content and manage projects without leaving the main view:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li>Chat is available from the dashboard with visibility control (show/hide)</li>
                <li>Create new projects directly from the chat flow</li>
                <li>AI content generation works inside the chat for prompts and ideas</li>
                <li>Instagram cards in chat support rewrite, image generation, edit, copy, and post actions</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5 text-yellow-600" />
                Image Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Generate images in multiple places across the product:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
                <li><strong>Dashboard / Quick Generate:</strong> Generate images for posts and social cards</li>
                <li><strong>Ad creatives (Brand Discovery):</strong> Generate images for Facebook ad concepts from their descriptions</li>
                <li><strong>Instagram cards in chat:</strong> Use image generation from the card actions</li>
                <li>Credits are deducted per generation; confirmations appear before spending when applicable</li>
              </ul>
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

          <Card id="advanced-customization">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-teal-600" />
                Advanced Customization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Fine-tune content generation with advanced options. Advanced Customization provides granular control over content generation, including tone, style, and platform-specific optimizations.
              </p>
              <p className="text-sm font-medium mb-2">Customization options:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Content tone and style adjustments</li>
                <li>Platform-specific formatting preferences</li>
                <li>Character limit overrides</li>
                <li>Custom prompts and instructions</li>
                <li>Template selection and customization</li>
              </ul>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

