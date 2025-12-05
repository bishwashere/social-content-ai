"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link2 } from "lucide-react";

export default function AdvancedCustomizationPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-6 w-6 text-teal-600" />
            <h1 className="text-4xl font-bold">Advanced Customization</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Fine-tune content generation with advanced options
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Advanced Customization provides granular control over content generation, including tone, style, and platform-specific optimizations.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customization Options</CardTitle>
            </CardHeader>
            <CardContent>
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

