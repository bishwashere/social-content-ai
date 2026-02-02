"use client"

import Link from "next/link"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

export function IdeasHeader() {
  return (
    <div className="w-full px-4 border-b h-fit relative overflow-hidden flex items-center justify-center">
      <div className="flex flex-col md:flex-row md:h-16 items-start md:items-center justify-between bg-background w-full md:px-8 py-3 md:py-0 gap-3 md:gap-0">
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
        <div className="flex items-center gap-3 self-end md:self-auto">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
