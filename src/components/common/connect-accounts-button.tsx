"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Link as LinkIcon, Lock, Shield } from "lucide-react"
import { useSession } from "@/backend-apis/auth/hooks"
import { useQuery } from "@tanstack/react-query"
import { signIn } from "next-auth/react"
import Image from "next/image"
import { authenticateWithThreads } from "@/lib/auth/threads"
import { useState } from "react"

type ConnectedProvider = {
  platform: string
}

export function ConnectAccountsButton() {
  const { data: session } = useSession()
  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false)

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
    <div className="flex gap-3 justify-center items-center">
      {hasFacebook && <div className="opacity-40">
        <Image
          src="/facebook.svg"
          alt="Facebook connected"
          width={20}
          height={20}
        />
      </div>}
      {hasLinkedin && <div className="opacity-40">
        <Image
          src="/linkedin.png"
          alt="LinkedIn connected"
          width={20}
          height={20}
        />
      </div>}
      {hasTwitter && <div className="opacity-40">
        <Image
          src="/x.svg"
          alt="X connected"
          width={20}
          height={20}
        />
      </div>}
      {hasReddit && <div className="opacity-40">
        <Image
          src="/reddit.svg"
          alt="Reddit connected"
          width={20}
          height={20}
        />
      </div>}
      {hasTiktok && <div className="opacity-40">
        <Image
          src="tiktok.svg"
          alt="Tiktok connected"
          width={20}
          height={20}
        />
      </div>}
      {hasThreads && <div className="opacity-40">
        <Image
          src="threads.svg"
          alt="Threads connected"
          width={20}
          height={20}
        />
      </div>}

      {(!hasFacebook || !hasLinkedin || !hasReddit || !hasThreads || !hasTiktok || !hasTwitter) &&
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50"
            >
              <LinkIcon className="h-4 w-4" />
              <p className="hidden sm:block">Connect Socials</p>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsSecurityDialogOpen(true)} className="cursor-pointer">
              <Lock className="mr-2 h-4 w-4" />
              <span>Why it&apos;s safe</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }

      {/* Security Dialog */}
      <Dialog open={isSecurityDialogOpen} onOpenChange={setIsSecurityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              Your Data is Secure
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              We take your privacy and security seriously.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Your social media keys and credentials are stored using industry-standard hashing and encryption techniques. 
                This means your sensitive information is protected in multiple layers, and no one can access it except you.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Security Features:</h4>
              <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                <li>Credentials are hashed using secure algorithms</li>
                <li>Multi-step encryption protects your data</li>
                <li>Only you have access to your connected accounts</li>
                <li>We never store your passwords and API keys in plain text</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

