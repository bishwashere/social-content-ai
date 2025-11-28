"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Link as LinkIcon } from "lucide-react"
import { useSession } from "@/backend-apis/auth/hooks"
import { useQuery } from "@tanstack/react-query"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { authenticateWithThreads } from "@/lib/auth/threads"

type ConnectedProvider = {
  platform: string
}

export function ConnectAccountsButton() {
  const { data: session } = useSession()

  const { data: accountsData, isLoading } = useQuery({
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

  // Hide if still loading
  if (isLoading) {
    return null
  }

  // Show icons if both Facebook AND LinkedIn are connected
  if (accountsData?.hasFacebook && accountsData?.hasLinkedin && accountsData?.hasThreads && accountsData?.hasTiktok && accountsData.hasTwitter) {
    return (
      <div className="flex items-center gap-2">
        <div className="opacity-40">
          <Image
            src="/facebook.svg"
            alt="Facebook connected"
            width={20}
            height={20}
          />
        </div>
        <div className="opacity-40">
          <Image
            src="/linkedin.png"
            alt="LinkedIn connected"
            width={20}
            height={20}
          />
        </div>
        <div className="opacity-40">
          <Image
            src="/x.svg"
            alt="X connected"
            width={20}
            height={20}
          />
        </div>
        <div className="opacity-40">
          <Image
            src="/reddit.svg"
            alt="Reddit connected"
            width={20}
            height={20}
          />
        </div>
        <div className="opacity-40">
          <Image
            src="tiktok.svg"
            alt="Tiktok connected"
            width={20}
            height={20}
          />
        </div>
        <div className="opacity-40">
          <Image
            src="threads.svg"
            alt="Threads connected"
            width={20}
            height={20}
          />
        </div>
      </div>
    )
  }

  // If at least one is not connected, show the dropdown with available options
  const hasFacebook = accountsData?.hasFacebook || false
  const hasLinkedin = accountsData?.hasLinkedin || false
  const hasTwitter = accountsData?.hasTwitter || false
  const hasTiktok = accountsData?.hasTiktok || false
  const hasThreads = accountsData?.hasThreads || false
  const hasReddit = accountsData?.hasReddit || false


  const handleFacebookConnect = () => {
    signIn("facebook")
  }

  const handleLinkedInConnect = () => {
    const currentUrl = window.location.href
    window.location.href = `/api/linkedin-login/auth?redirectTo=${encodeURIComponent(currentUrl)}`
  }

  const handleTwitterConnect = () => {
    signIn("twitter")
  }

  const handleTiktokConnect = () => {
    signIn("tiktok")
  }

  const handleThreadsConnect = () => {
    return authenticateWithThreads()
  }

  const handleRedditConnect = () => {
    signIn("reddit")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
        >
          <LinkIcon className="h-4 w-4" />
          Connect Socials
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {!hasFacebook && (
          <DropdownMenuItem onClick={handleFacebookConnect} className="cursor-pointer">
            <Image
              src="/facebook.svg"
              alt="Facebook"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>Connect Facebook</span>
          </DropdownMenuItem>
        )}
        {!hasLinkedin && (
          <DropdownMenuItem onClick={handleLinkedInConnect} className="cursor-pointer">
            <Image
              src="/linkedin.png"
              alt="LinkedIn"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>Connect LinkedIn</span>
          </DropdownMenuItem>
        )}
        {!hasTwitter && (
          <DropdownMenuItem onClick={handleTwitterConnect} className="cursor-pointer">
            <Image
              src="/x.svg"
              alt="X"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>Connect X</span>
          </DropdownMenuItem>
        )}
        {!hasReddit && (
          <DropdownMenuItem onClick={handleRedditConnect} className="cursor-pointer">
            <Image
              src="/reddit.svg"
              alt="Reddit"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>Connect Reddit</span>
          </DropdownMenuItem>
        )}
        {!hasTiktok && (
          <DropdownMenuItem onClick={handleTiktokConnect} className="cursor-pointer">
            <Image
              src="/tiktok.svg"
              alt="Tiktok"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>Connect Tiktok</span>
          </DropdownMenuItem>
        )}
        {!hasThreads && (
          <DropdownMenuItem onClick={handleThreadsConnect} className="cursor-pointer">
            <Image
              src="/threads.svg"
              alt="Threads"
              width={16}
              height={16}
              className="mr-2"
            />
            <span>Connect Threads</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

