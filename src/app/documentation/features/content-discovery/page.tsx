"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Eye, Search } from "lucide-react";

export default function ContentDiscoveryPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-6 w-6 text-cyan-600" />
          <h1 className="text-4xl font-bold">Content Discovery</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Discover and explore content from the community
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Wall / Social Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Browse posts from all users in a unified social feed:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>For You Tab:</strong> Curated content feed</li>
              <li><strong>Templates Tab:</strong> Browse content templates</li>
              <li><strong>Post Discovery:</strong> Explore posts from the community</li>
              <li><strong>View Tracking:</strong> Automatic view counting</li>
              <li><strong>Pagination:</strong> Infinite scroll with load more</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Post to Wall</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Share your generated content to the public wall for others to discover and get inspired.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
