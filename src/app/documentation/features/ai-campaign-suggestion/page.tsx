"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";

export default function AICampaignSuggestionPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-6 w-6 text-amber-600" />
          <h1 className="text-4xl font-bold">AI Campaign Suggestion</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Get AI-generated campaign ideas based on your performance data
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              AI Campaign Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Get AI-generated campaign ideas based on your performance data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Suggestions are derived from your engagement trends and best-performing content</li>
              <li>Project-level analytics includes expandable cards with actionable campaign ideas</li>
              <li>Use insights to plan your next campaigns without leaving the analytics view</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
