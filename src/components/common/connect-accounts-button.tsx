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

export function ConnectAccountsButton() {
  const { data: session } = useSession()
  
  const { data: hasConnectedAccounts, isLoading } = useQuery({
    queryKey: ["connected-accounts", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return true // Hide if no session
      
      const response = await fetch(`/api/check-oauth-providers?userId=${session.user.id}`)
      const data = await response.json()
      return data.hasProviders
    },
    enabled: !!session?.user?.id,
  })

  // Hide button if user has connected accounts or still loading
  if (isLoading || hasConnectedAccounts) {
    return null
  }

  const handleFacebookConnect = () => {
    signIn("facebook")
  }

  const handleLinkedInConnect = () => {
    const currentUrl = window.location.href
    window.location.href = `/api/linkedin-login/auth?redirectTo=${encodeURIComponent(currentUrl)}`
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

