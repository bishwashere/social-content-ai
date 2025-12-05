"use client";

import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { usePathname } from "next/navigation";

export function DocumentationHeader() {
  const pathname = usePathname();
  
  // Extract the current section from pathname
  const getCurrentSection = () => {
    if (!pathname) return "Documentation";
    if (pathname === "/documentation") return "Documentation";
    if (pathname.startsWith("/documentation/security")) return "Security Overview";
    if (pathname.startsWith("/documentation/platforms")) {
      const platform = pathname.split("/").pop();
      if (platform === "platforms") return "Platforms";
      return platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : "Platforms";
    }
    if (pathname.startsWith("/documentation/features")) {
      const feature = pathname.split("/").pop();
      if (feature === "features") return "Features";
      return feature ? feature.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "Features";
    }
    return "Documentation";
  };

  return (
    <div className="w-full px-4 border-b h-fit relative overflow-hidden flex items-center justify-center">
      <div className="flex h-16 items-center justify-between bg-background w-full md:px-8">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            <Image
              src="/logo-transparent.png"
              width="100"
              height="100"
              alt="NextPostAI"
              className="size-6"
            />
            <span className="font-semibold text-lg">NextPostAI</span>
          </Link>
          <span className="text-muted-foreground mx-2">/</span>
          <Link
            href="/documentation"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Documentation
          </Link>
          {pathname !== "/documentation" && (
            <>
              <span className="text-muted-foreground mx-2">/</span>
              <span className="text-muted-foreground truncate max-w-xs">{getCurrentSection()}</span>
            </>
          )}
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

