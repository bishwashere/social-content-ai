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

type GroupedProviders = {
  [key: string]: OauthProvider[];
};

export function OAuthProvidersList() {
  const { data: session } = useSession();
  const { data: providers, isLoading } = useOAuthProviders();
  const del = useDeleteAllUserOAuthProviders();

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
          <CardTitle>Connect Social Accounts</CardTitle>
          <CardDescription>
            Connect your social media accounts to automatically post content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => (
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
                  className={platform.connected ? "opacity-40" : ""}
                />
                <span>
                  {platform.connected ? "Reconnect" : "Connect"} {platform.name}
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
