"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, Key, Rocket, Users, DollarSign, Plug, Trophy, FolderKanban } from "lucide-react";
import Link from "next/link";

export default function DocumentationPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-muted-foreground text-lg">
          Complete guide to NextPost AI&apos;s features, security, and platform integrations
        </p>
      </div>

      <div className="space-y-6">
        {/* Quick Start Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/documentation/getting-started">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-orange-600" />
                    <CardTitle>Getting Started</CardTitle>
                  </div>
                  <CardDescription>
                    Onboarding guides, tours, and first steps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Guided setup, interactive tours, and quick start tutorials
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Core Features Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Core Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/documentation/features">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    <CardTitle>Features</CardTitle>
                  </div>
                  <CardDescription>
                    Explore all NextPost AI features and capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Quick Generate, Campaign Planner, Video, Analytics, Templates, Auto post, and more
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/documentation/user-engagement">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-green-600" />
                    <CardTitle>User Engagement</CardTitle>
                  </div>
                  <CardDescription>
                    Achievements, progress tracking, and daily tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Achievement levels, Your Today feature, and consistency tracking
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/documentation/project-management">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5 text-blue-600" />
                    <CardTitle>Project Management</CardTitle>
                  </div>
                  <CardDescription>
                    Organize projects, collaborate with teams
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Project folders, team collaboration, and role-based access
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Platform & Integration Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Platforms & Integrations</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/documentation/platforms">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-blue-600" />
                    <CardTitle>Platforms</CardTitle>
                  </div>
                  <CardDescription>
                    Connect and manage your social media accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Facebook, Instagram, LinkedIn, Twitter, TikTok, Threads, Reddit
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/documentation/integrations">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Plug className="h-5 w-5 text-purple-600" />
                    <CardTitle>Integrations</CardTitle>
                  </div>
                  <CardDescription>
                    Webhooks, API access, and developer tools
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Webhook endpoints, API reference, and integration guides
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Account & Security Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Account & Security</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href="/documentation/pricing-billing">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <CardTitle>Pricing & Billing</CardTitle>
                  </div>
                  <CardDescription>
                    Subscription plans, free credits, and billing management
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Plans, credits system, and subscription management
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/documentation/security">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <CardTitle>Security Overview</CardTitle>
                  </div>
                  <CardDescription>
                    Learn how we protect your credentials and data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Encryption, token management, and security best practices
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
