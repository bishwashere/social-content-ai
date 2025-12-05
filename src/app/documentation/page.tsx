"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Zap, Key } from "lucide-react";
import Link from "next/link";

export default function DocumentationPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-muted-foreground text-lg">
          Complete guide to NextPost AI's features, security, and platform integrations
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Security Overview */}
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

        {/* Platforms */}
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

        {/* Features */}
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
                Quick Generate, Campaign Planner, Webhooks, and more
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
