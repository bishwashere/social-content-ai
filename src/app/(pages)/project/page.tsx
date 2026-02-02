"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect /project (legacy dashboard URL) to /dashboard
 */
export default function ProjectRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);
  return null;
}
