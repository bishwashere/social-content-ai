"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CampaignAnalytics {
  id: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalImpressions: number;
  avgEngagementRate: number;
  bestPostingHour: number | null;
  bestDayOfWeek: number | null;
  bestPlatform: string | null;
  platformMetrics: Record<string, any>;
  calculatedAt: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CampaignAnalyticsSummary({ campaignId }: { campaignId: string }) {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/analytics`);
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
      const response = await fetch(`/api/campaigns/${campaignId}/analyze`, {
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

  useEffect(() => {
    loadAnalytics();
  }, [campaignId]);

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
          <CardTitle>📊 Campaign Analytics</CardTitle>
          <CardDescription>
            Analyze your campaign performance and get insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              {error || "No analytics available yet. Calculate analytics to see performance data."}
            </p>
            <Button onClick={calculateNewAnalytics} disabled={calculating}>
              {calculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Calculate Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>📊 Campaign Performance</CardTitle>
            <CardDescription>
              Last calculated: {new Date(analytics.calculatedAt).toLocaleString()}
            </CardDescription>
          </div>
          <Button onClick={calculateNewAnalytics} disabled={calculating} variant="outline" size="sm">
            {calculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Total Posts" value={analytics.totalPosts} />
          <MetricCard label="Total Likes" value={analytics.totalLikes} />
          <MetricCard label="Total Comments" value={analytics.totalComments} />
          <MetricCard label="Total Shares" value={analytics.totalShares} />
          <MetricCard label="Impressions" value={analytics.totalImpressions.toLocaleString()} />
          <MetricCard
            label="Engagement Rate"
            value={`${analytics.avgEngagementRate.toFixed(2)}%`}
          />
        </div>

        {/* Best Performers */}
        {(analytics.bestPostingHour !== null || analytics.bestDayOfWeek !== null || analytics.bestPlatform) && (
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Best Performers
            </h3>
            <div className="space-y-3">
              {analytics.bestPostingHour !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Time</p>
                    <p className="font-medium">{formatTime(analytics.bestPostingHour)}</p>
                  </div>
                </div>
              )}
              {analytics.bestDayOfWeek !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Day</p>
                    <p className="font-medium">{DAY_NAMES[analytics.bestDayOfWeek]}</p>
                  </div>
                </div>
              )}
              {analytics.bestPlatform && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-sm text-muted-foreground">Best Platform</p>
                    <p className="font-medium capitalize">{analytics.bestPlatform}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Platform Breakdown */}
        {Object.keys(analytics.platformMetrics).length > 0 && (
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Platform Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(analytics.platformMetrics).map(([platform, metrics]: [string, any]) => (
                <div key={platform} className="p-3 border rounded-lg">
                  <p className="font-medium capitalize mb-2">{platform}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Posts</p>
                      <p className="font-medium">{metrics.posts}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Engagement Rate</p>
                      <p className="font-medium">{metrics.engagementRate.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Likes</p>
                      <p className="font-medium">{metrics.likes}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Impressions</p>
                      <p className="font-medium">{metrics.impressions.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 border rounded-lg">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
