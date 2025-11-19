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

type ConnectedProvider = {
  platform: string
}

export function ConnectAccountsButton() {
  const { data: session } = useSession()
  
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ["connected-accounts", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return { hasProviders: false, providers: [] }
      
      const response = await fetch(`/api/check-oauth-providers?userId=${session.user.id}`)
      const data = await response.json()
      return {
        hasProviders: data.hasProviders,
        providers: data.providers || []
      }
    },
    enabled: !!session?.user?.id,
  })

  // Show connected platform icons if user has connected accounts
  if (accountsData?.hasProviders && accountsData.providers.length > 0) {
    return (
      <div className="flex items-center gap-2">
        {accountsData.providers.map((provider: ConnectedProvider) => (
          <div key={provider.platform} className="opacity-40">
            {provider.platform === "facebook" && (
              <Image 
                src="/facebook.svg" 
                alt="Facebook connected" 
                width={20} 
                height={20}
              />
            )}
            {provider.platform === "linkedin" && (
              <Image 
                src="/linkedin.png" 
                alt="LinkedIn connected" 
                width={20} 
                height={20}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Hide if still loading
  if (isLoading) {
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

