"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutTemplate } from "lucide-react";

export default function TemplatesLibraryPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <LayoutTemplate className="h-6 w-6 text-purple-600" />
          <h1 className="text-4xl font-bold">Templates Library</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Browse and use pre-built content templates
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Access a library of proven content templates organized by category.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Template Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Story:</strong> Personal narratives and journeys</li>
              <li><strong>Tip:</strong> Quick tips and advice</li>
              <li><strong>How-To:</strong> Step-by-step guides</li>
              <li><strong>Question:</strong> Engagement-driving questions</li>
              <li><strong>Opinion:</strong> Thought-provoking takes</li>
              <li><strong>List:</strong> Numbered and bulleted lists</li>
              <li><strong>Behind-the-Scenes:</strong> Behind-the-scenes content</li>
              <li><strong>Humor:</strong> Funny and entertaining posts</li>
              <li><strong>Case Study:</strong> Success stories and examples</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Browse templates in the Wall/Templates tab</li>
              <li>Select a template that fits your content goal</li>
              <li>Fill in the placeholders ({"{{like this}}"})</li>
              <li>Generate platform-specific versions</li>
              <li>Edit and customize before posting</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
