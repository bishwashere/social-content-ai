"use client";
import { useSession } from "@/backend-apis/auth/hooks";
import Loading from "@/components/common/loading";
import React, { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const isPublic = (path: string) => {
  return (
    path === "/" ||
    path.startsWith("/ideas") ||
    path.startsWith("/get") ||
    path.startsWith("/privacy") ||
    path.startsWith("/terms") ||
    path.startsWith("/referral")
  );
};

/**
 *  SessionProvider is a component that checks if the user is authenticated or not.
 *  If the user is authenticated, it redirects to the dashboard page.
 *  If the user is not authenticated, it redirects to the home page.
 */
const SessionProvider = ({ children }: Props) => {
  const { isLoading, isError } = useSession();
  const path = usePathname();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading) {
      hasRedirected.current = false;
      return;
    }

    // Allow public access to landing page and ideas
    if (isPublic(path)) {
      hasRedirected.current = false;
      return;
    }

    if (isError && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/"); // ✅ Redirect to the home page (replace to avoid adding to history)
    }
  }, [isError, isLoading, router, path]);

  if (isPublic(path)) return children;

  if (isLoading) {
    // Allow public access to landing page, ideas, and referral pages
    if (path === "/" || path.startsWith("/ideas") || path.startsWith("/get") || path.startsWith("/privacy") || path.startsWith("/terms") || path.startsWith("/referral")) return children;
    return <Loading className="h-screen" />;
  }

  if (isError) {
    // Allow public access to landing page, ideas, and referral pages
    if (path === "/" || path.startsWith("/ideas") || path.startsWith("/get") || path.startsWith("/privacy") || path.startsWith("/terms") || path.startsWith("/referral")) return children;
    // Show loading while redirecting to prevent render errors
    return <Loading className="h-screen" />;
  }

  return children;
};

export default SessionProvider;
