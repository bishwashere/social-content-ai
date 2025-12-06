"use client"

import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function IdeasHeader() {
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
          <span className="text-muted-foreground">Ideas</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/project">Go to Dashboard</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
