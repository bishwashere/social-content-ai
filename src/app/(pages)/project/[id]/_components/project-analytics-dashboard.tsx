"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProjectAnalytics {
  id: string;
  totalPosts: number;
  totalCampaigns: number;
  avgEngagementRate: number;
  recommendedTime: string | null;
  recommendedPlatforms: string[];
  contentSuggestions: Record<string, any>;
  engagementTrend: string | null;
  campaignSuggestions: any[];
  calculatedAt: string;
}

export function ProjectAnalyticsDashboard({ projectId }: { projectId: string }) {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Get viewer's timezone for displaying times
  const viewerTimezone =
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/analytics`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setError("Failed to load analytics");
    }
    setLoading(false);
  };

  const calculateNewAnalytics = async () => {
    setCalculating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || "Failed to calculate analytics");
      }
    } catch (error) {
      console.error("Failed to calculate analytics:", error);
      setError("Failed to calculate analytics");
    }
    setCalculating(false);
  };

  // Fetch only when user expands to see stats
  useEffect(() => {
    if (expanded) {
      loadAnalytics();
    }
  }, [expanded, projectId]);

  // Collapsed: show trigger only (no fetch)
  if (!expanded) {
    return (
      <Card className="mb-6">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Project analytics</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
              Show stats
            </Button>
          </div>
          <CardDescription>
            View overview, engagement, and AI campaign suggestions
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading analytics...</span>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                AI Campaign Suggestions
              </CardTitle>
              <CardDescription>
                Get AI-powered campaign ideas based on your project&apos;s performance
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(false)}>
              Hide stats
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {error || "No analytics available yet. Calculate analytics to get AI-powered campaign suggestions."}
            </p>
            <Button onClick={calculateNewAnalytics} disabled={calculating}>
              {calculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Campaign Ideas
            </Button>
            {calculating && (
              <p className="text-sm text-muted-foreground mt-4">
                Analyzing your project performance and generating ideas... This may take a minute.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (trend: string | null) => {
    if (trend === "improving") return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Project Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📊 Project Overview</CardTitle>
              <CardDescription>
                Last calculated: {new Date(analytics.calculatedAt).toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setExpanded(false)} variant="ghost" size="sm">
                Hide stats
              </Button>
              <Button onClick={calculateNewAnalytics} disabled={calculating} variant="outline" size="sm">
                {calculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Posts" value={analytics.totalPosts} />
            <MetricCard label="Total Campaigns" value={analytics.totalCampaigns} />
            <MetricCard
              label="Avg Engagement"
              value={`${analytics.avgEngagementRate.toFixed(2)}%`}
            />
            <div className="p-3 border rounded-lg">
              <p className="text-sm text-muted-foreground">Trend</p>
              <div className="flex items-center gap-2 mt-1">
                {getTrendIcon(analytics.engagementTrend)}
                <p className="text-lg font-bold capitalize">{analytics.engagementTrend || "Stable"}</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="mt-6 space-y-3 border-t pt-6">
            <h3 className="font-semibold mb-4">💡 Recommendations</h3>
            {analytics.recommendedTime && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">⏰</span>
                <div>
                  <p className="text-sm text-muted-foreground">Best Time to Post</p>
                  <p className="font-medium">{formatRecommendedTime(analytics.recommendedTime, viewerTimezone)}</p>
                </div>
              </div>
            )}
            {analytics.recommendedPlatforms.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-sm text-muted-foreground">Top Platforms</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {analytics.recommendedPlatforms.map((platform) => (
                      <Badge key={platform} variant="secondary">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Campaign Suggestions */}
      {analytics.campaignSuggestions && analytics.campaignSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Campaign Suggestions
            </CardTitle>
            <CardDescription>
              New campaign ideas based on your performance data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.campaignSuggestions.map((suggestion: any, index: number) => (
                <CampaignSuggestionCard key={index} suggestion={suggestion} index={index} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Convert a UTC time string (e.g., "14:00") to the viewer's local timezone with abbreviation
 */
function formatRecommendedTime(utcTimeStr: string, viewerTimezone: string): string {
  const utcHour = parseInt(utcTimeStr.split(":")[0], 10);
  if (isNaN(utcHour)) return utcTimeStr;

  // Create a reference date with the UTC hour
  const refDate = new Date();
  refDate.setUTCHours(utcHour, 0, 0, 0);

  // Format time in viewer's timezone
  const timeStr = refDate.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: viewerTimezone,
  });

  // Get timezone abbreviation
  const tzAbbr = refDate.toLocaleString("en-US", {
    timeZoneName: "short",
    timeZone: viewerTimezone,
  }).split(" ").pop() || viewerTimezone;

  return `${timeStr} ${tzAbbr}`;
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 border rounded-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function CampaignSuggestionCard({ suggestion, index }: { suggestion: any; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">Idea {index + 1}</Badge>
            <h4 className="font-semibold">{suggestion.name}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{suggestion.goal}</p>
          
          {expanded && (
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Target Audience:</p>
                <p className="text-sm text-muted-foreground">{suggestion.targetAudience}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Why This Will Work:</p>
                <p className="text-sm text-muted-foreground">{suggestion.why}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-sm font-medium">Platforms:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {suggestion.suggestedPlatforms?.map((p: string) => (
                      <Badge key={p} variant="secondary" className="text-xs">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Best Time:</p>
                  <p className="text-sm text-muted-foreground">{suggestion.suggestedTime}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Duration:</p>
                  <p className="text-sm text-muted-foreground">{suggestion.duration}</p>
                </div>
              </div>
              {suggestion.contentIdeas && suggestion.contentIdeas.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Content Ideas:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {suggestion.contentIdeas.map((idea: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        {idea}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setExpanded(!expanded)}
        className="mt-2 w-full"
      >
        {expanded ? "Show Less" : "Show More"}
      </Button>
    </div>
  );
}
