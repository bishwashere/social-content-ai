"use client";
import { useSession } from "@/backend-apis/auth/hooks";
import Loading from "@/components/common/loading";
import React, { useEffect } from "react";
import HomePage from "@/app/get/page"; // Import the home page component
import { usePathname, useRouter } from "next/navigation";

type Props = {
  children: React.ReactNode;
};

const isPublic = (path: string) => {
  return (
    path === "/" ||
    path.startsWith("/blogs") ||
    path.startsWith("/get") ||
    path.startsWith("/privacy")
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

  useEffect(() => {
    if (isLoading) return;

    // Allow public access to landing page and blogs
    if (isPublic(path)) return;

    if (isError) {
      router.replace("/"); // ✅ Redirect to the home page (replace to avoid adding to history)
    }
  }, [isError, isLoading, router, path]);

  if (isPublic(path)) return children;

  if (isLoading) {
    // Allow public access to landing page and blogs
    if (path === "/" || path.startsWith("/blogs") || path.startsWith("/get")) return children;
    return <Loading className="h-screen" />;
  }

  if (isError) {
    // Allow public access to landing page and blogs
    if (path === "/" || path.startsWith("/blogs") || path.startsWith("/get")) return children;
    return <HomePage />; // ✅ Show the home page instead of UnauthorizedError
  }

  return children;
};

export default SessionProvider;
