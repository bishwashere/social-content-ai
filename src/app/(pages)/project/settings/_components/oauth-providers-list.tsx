"use client";

import { useSession } from "@/backend-apis/auth/hooks";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useOAuthProviders } from "@/server-actions/oauth-providers/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { OauthProvider } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { authenticateWithThreads } from "@/lib/auth/threads";
import { signIn } from "next-auth/react";
import { useDeleteAllUserOAuthProviders } from "@/backend-apis/user/hooks";
import { confirm } from "@/components/ui/alert-dialog";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Lock, Shield } from "lucide-react";
import { authenticateWithInstagram } from "@/lib/auth/instagram";

type GroupedProviders = {
  [key: string]: OauthProvider[];
};

export function OAuthProvidersList() {
  const { data: session } = useSession();
  const { data: providers, isLoading } = useOAuthProviders();
  const del = useDeleteAllUserOAuthProviders();
  const [showSecurityInfo, setShowSecurityInfo] = useState(false);

  // Get connection status for all platforms
  const { data: accountsData } = useQuery({
    queryKey: ["connected-accounts", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return { hasProviders: false, hasFacebook: false, hasLinkedin: false, providers: [] }

      const response = await fetch(`/api/check-oauth-providers?userId=${session.user.id}`, {
        cache: 'no-store',
      })
      const result = await response.json()
      const data = result.data || result
      return {
        hasProviders: data.hasProviders || false,
        hasFacebook: data.hasFacebook || false,
        hasLinkedin: data.hasLinkedin || false,
        hasTwitter: data.hasTwitter || false,
        hasTiktok: data.hasTiktok || false,
        hasThreads: data.hasThreads || false,
        hasReddit: data.hasReddit || false,
        hasInstagram: data.hasInstagram || false,
        providers: data.providers || []
      }
    },
    enabled: !!session?.user?.id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })

  // Group providers by platform
  const groupedProviders =
    providers?.reduce((acc: GroupedProviders, provider: OauthProvider) => {
      const platform = provider.platform.toLowerCase();
      if (!acc[platform]) {
        acc[platform] = [];
      }
      acc[platform].push(provider);
      return acc;
    }, {}) ?? {};

  const hasFacebook = accountsData?.hasFacebook || false;
  const hasLinkedin = accountsData?.hasLinkedin || false;
  const hasTwitter = accountsData?.hasTwitter || false;
  const hasTiktok = accountsData?.hasTiktok || false;
  const hasThreads = accountsData?.hasThreads || false;
  const hasReddit = accountsData?.hasReddit || false;
  const hasInstagram = accountsData?.hasInstagram || false;

  // Connection handlers (same as header dropdown)
  const handleFacebookConnect = () => {
    signIn("facebook");
  };

  const handleLinkedInConnect = () => {
    const currentUrl = window.location.href;
    window.location.href = `/api/linkedin-login/auth?redirectTo=${encodeURIComponent(currentUrl)}`;
  };

  const handleTwitterConnect = () => {
    signIn("twitter");
  };

  const handleTiktokConnect = () => {
    signIn("tiktok");
  };

  const handleThreadsConnect = () => {
    return authenticateWithThreads();
  };

  const handleRedditConnect = () => {
    signIn("reddit");
  };

  const handleInstagramConnect = () => {
    return authenticateWithInstagram();
  }

  // Platform configuration
  const platforms = [
    {
      key: "facebook",
      name: "Facebook",
      icon: "/facebook.svg",
      connected: hasFacebook,
      handler: handleFacebookConnect,
    },
    {
      key: "linkedin",
      name: "LinkedIn",
      icon: "/linkedin.png",
      connected: hasLinkedin,
      handler: handleLinkedInConnect,
    },
    {
      key: "twitter",
      name: "X (Twitter)",
      icon: "/x.svg",
      connected: hasTwitter,
      handler: handleTwitterConnect,
    },
    {
      key: "reddit",
      name: "Reddit",
      icon: "/reddit.svg",
      connected: hasReddit,
      handler: handleRedditConnect,
    },
    {
      key: "tiktok",
      name: "TikTok",
      icon: "/tiktok.svg",
      connected: hasTiktok,
      handler: handleTiktokConnect,
    },
    {
      key: "threads",
      name: "Threads",
      icon: "/threads.svg",
      connected: hasThreads,
      handler: handleThreadsConnect,
    },
    {
      key: "instagram",
      name: "Instagram",
      icon: "/instagram.svg",
      connected: hasInstagram,
      handler: handleInstagramConnect,
    },
  ];

  if (!session) return null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Show "No Connected Accounts" message at the top if no accounts */}
      {Object.keys(groupedProviders).length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Connected Accounts</CardTitle>
            <CardDescription>
              You haven&apos;t connected any social media accounts yet.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Show all platforms as buttons in one line */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Connect Social Accounts</CardTitle>
            <button
              onClick={() => setShowSecurityInfo(!showSecurityInfo)}
              className="text-muted-foreground text-sm hover:underline cursor-pointer flex items-center gap-1"
            >
              <Lock className="h-3 w-3" />
              Why it&apos;s safe
            </button>
          </div>
          <CardDescription>
            Connect your social media accounts to automatically post content
          </CardDescription>
          {showSecurityInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">Your Data is Secure</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                We take your privacy and security seriously.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">
                Your social media keys and credentials are stored using industry-standard hashing and encryption techniques. 
                This means your sensitive information is protected in multiple layers, and no one can access it except you.
              </p>
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-gray-900">Security Features:</h5>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>Credentials are hashed using secure algorithms</li>
                  <li>Multi-step encryption protects your data</li>
                  <li>Only you have access to your connected accounts</li>
                  <li>We never store your passwords and API keys in plain text</li>
                </ul>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Show unconnected platforms first */}
            {platforms.filter(p => !p.connected).map((platform) => (
              <Button
                key={platform.key}
                variant="outline"
                size="sm"
                onClick={platform.handler}
                className="gap-2"
              >
                <Image
                  src={platform.icon}
                  alt={platform.name}
                  width={16}
                  height={16}
                  className="dark:invert"
                />
                <span>
                  Connect {platform.name}
                </span>
              </Button>
            ))}
            {/* Show connected platforms at the end */}
            {platforms.filter(p => p.connected).map((platform) => (
              <Button
                key={platform.key}
                variant="outline"
                size="sm"
                onClick={platform.handler}
                className="gap-2"
              >
                <Image
                  src={platform.icon}
                  alt={platform.name}
                  width={16}
                  height={16}
                  className="opacity-40 dark:invert"
                />
                <span>
                  Reconnect {platform.name}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Show connected accounts details */}
      {Object.entries(groupedProviders).map(([platform, providers]) => (
        <Card key={platform}>
          <CardHeader>
            <CardTitle className="capitalize">{platform}</CardTitle>
            <CardDescription>
              {providers.length} connected {platform}{" "}
              {providers.length === 1 ? "account" : "accounts"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providers.map((provider, index) => (
                <div key={provider.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={
                          provider.platform === "facebook"
                            ? `https://www.facebook.com/profile.php?id=${provider.pageId}`
                            : "#"
                        }
                        target="_blank"
                        className="font-medium  underline"
                      >
                        {provider.pageName || provider.pageId}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Connected on{" "}
                        {new Date(provider.createdAt).toLocaleDateString()}{" "}
                        {provider.expiresAt &&
                          `| Expires on ${new Date(
                            provider.expiresAt
                          ).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedProviders).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Remove Connection</CardTitle>
            <CardDescription>
              If you are experiencing issues with connected accounts, you can
              remove it and reconnect.
            </CardDescription>
            <Button
              onClick={async () => {
                const confirmed = await confirm({
                  title: "Are you sure?",
                  description:
                    "This will delete all your connected accounts like (Facebook, Twitter etc) and you will need to reconnect them.",
                });

                if (!confirmed) return;

                del.mutate(session.user.id);
              }}
              loading={del.isPending}
              className="w-fit ml-auto"
              variant={"destructive-outline"}
            >
              Delete All Connections
            </Button>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
