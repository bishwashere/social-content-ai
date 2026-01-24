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
    (path.startsWith("/ideas") && !path.startsWith("/ideas/admin")) ||
    path.startsWith("/get") ||
    path.startsWith("/privacy") ||
    path.startsWith("/terms") ||
    path.startsWith("/referral") ||
    path.startsWith("/documentation") ||
    path.startsWith("/landing")
  );
};

const isAdminRoute = (path: string) => {
  return path.startsWith("/ideas/admin");
};

/**
 *  SessionProvider is a component that checks if the user is authenticated or not.
 *  If the user is authenticated, it redirects to the dashboard page.
 *  If the user is not authenticated, it redirects to the home page.
 */
const SessionProvider = ({ children }: Props) => {
  const path = usePathname();
  const router = useRouter();
  const hasRedirected = useRef(false);
  
  // Skip session check for admin routes - they have their own auth
  const shouldCheckSession = !isAdminRoute(path);
  const { isLoading, isError } = useSession({
    enabled: shouldCheckSession,
  });

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

    // Let admin routes handle their own authentication
    if (isAdminRoute(path)) {
      hasRedirected.current = false;
      return;
    }

    if (isError && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/"); // ✅ Redirect to the home page (replace to avoid adding to history)
    }
  }, [isError, isLoading, router, path]);

  if (isPublic(path)) return children;

  // Let admin routes render so they can handle their own auth
  if (isAdminRoute(path)) return children;

  if (isLoading) {
    // Allow public access to landing page, ideas (except admin), referral pages, and documentation
    if (isPublic(path)) return children;
    return <Loading className="h-screen" />;
  }

  if (isError) {
    // Allow public access to landing page, ideas (except admin), referral pages, and documentation
    if (isPublic(path)) return children;
    // Show loading while redirecting to prevent render errors
    return <Loading className="h-screen" />;
  }

  return children;
};

export default SessionProvider;
