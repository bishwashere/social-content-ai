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

type GroupedProviders = {
  [key: string]: OauthProvider[];
};

export function OAuthProvidersList() {
  const { data: session } = useSession();
  const { data: providers, isLoading } = useOAuthProviders();
  const del = useDeleteAllUserOAuthProviders();

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
              <div className="w-full flex justify-end">
                <Button
                  variant={"outline"}
                  onClick={() => {
                    if (platform === "threads") {
                      return authenticateWithThreads();
                    }
                    else if (platform === "linkedin") {
                      const currentUrl = window.location.href;
                      window.location.href = `/api/linkedin-login/auth?redirectTo=${encodeURIComponent(currentUrl)}`;
                    } else {
                      signIn(platform);
                    }
                  }}
                  className="ml-auto"
                >
                  Reconnect{" "}
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {Object.keys(groupedProviders).length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Connected Accounts</CardTitle>
            <CardDescription>
              You haven&apos;t connected any social media accounts yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
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
