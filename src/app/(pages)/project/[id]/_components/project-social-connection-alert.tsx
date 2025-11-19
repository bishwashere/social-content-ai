"use client"

import { useEffect, useState, useCallback } from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useSession } from "@/backend-apis/auth/hooks"
import { checkProjectOAuthProvider } from "@/server-actions/check-project-oauth-provider"
import { mapProjectToOAuthProvider } from "@/server-actions/map-project-oauth-provider"
import { toast } from "sonner"
import { LinkIcon } from "lucide-react"
import Image from "next/image"
import { useQueryClient } from "@tanstack/react-query"

type AvailableProvider = {
  id: string
  pageName?: string | null
  pageId?: string | null
  isPersonal?: boolean
}

type Props = {
  projectId: string
}

export function ProjectSocialConnectionAlert({ projectId }: Props) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showAlert, setShowAlert] = useState(false)
  const [facebookProviders, setFacebookProviders] = useState<AvailableProvider[]>([])
  const [linkedinProviders, setLinkedinProviders] = useState<AvailableProvider[]>([])
  const [isMappingFacebook, setIsMappingFacebook] = useState(false)
  const [isMappingLinkedin, setIsMappingLinkedin] = useState(false)
  const [hasFacebookConnected, setHasFacebookConnected] = useState(false)
  const [hasLinkedinConnected, setHasLinkedinConnected] = useState(false)

  const checkAvailableProviders = useCallback(async () => {
    if (!session?.user?.id || !projectId) return

    try {
      // Check Facebook providers
      const fbResult = await checkProjectOAuthProvider(projectId, session.user.id, "facebook")
      
      // Check LinkedIn providers
      const liResult = await checkProjectOAuthProvider(projectId, session.user.id, "linkedin")

      // Get available providers that are not mapped to this project
      const fbAvailable = fbResult.availableProviders || []
      const liAvailable = liResult.availableProviders || []

      // Check if platforms are already connected to this project
      setHasFacebookConnected(fbResult.isProjectMapped)
      setHasLinkedinConnected(liResult.isProjectMapped)

      // Update provider lists
      setFacebookProviders(fbAvailable)
      setLinkedinProviders(liAvailable)

      // Show alert only if there are unmapped providers
      if (fbAvailable.length > 0 || liAvailable.length > 0) {
        setShowAlert(true)
      } else {
        setShowAlert(false)
      }
    } catch (error) {
      console.error("Error checking available providers:", error)
    }
  }, [projectId, session?.user?.id])

  useEffect(() => {
    checkAvailableProviders()
  }, [checkAvailableProviders])

  const handleConnectFacebook = async (providerId: string) => {
    if (!session?.user?.id || !providerId) return

    setIsMappingFacebook(true)
    try {
      await mapProjectToOAuthProvider(projectId, providerId, session.user.id)
      toast.success("Facebook account connected to project!")
      
      // Invalidate header's connected accounts cache
      queryClient.invalidateQueries({ queryKey: ["connected-accounts", session.user.id] })
      
      // Recheck available providers - this will hide Facebook dropdown
      await checkAvailableProviders()
    } catch (error) {
      console.error("Error mapping Facebook provider:", error)
      toast.error("Failed to connect Facebook account")
    } finally {
      setIsMappingFacebook(false)
    }
  }

  const handleConnectLinkedin = async (providerId: string) => {
    if (!session?.user?.id || !providerId) return

    setIsMappingLinkedin(true)
    try {
      await mapProjectToOAuthProvider(projectId, providerId, session.user.id)
      toast.success("LinkedIn account connected to project!")
      
      // Invalidate header's connected accounts cache
      queryClient.invalidateQueries({ queryKey: ["connected-accounts", session.user.id] })
      
      // Recheck available providers - this will hide LinkedIn dropdown
      await checkAvailableProviders()
    } catch (error) {
      console.error("Error mapping LinkedIn provider:", error)
      toast.error("Failed to connect LinkedIn account")
    } finally {
      setIsMappingLinkedin(false)
    }
  }

  // Don't show anything if platforms are already connected or no unmapped providers
  if (!showAlert) return null

  return (
    <div className="px-6 mb-4 max-w-4xl mx-auto">
      <Alert className="border-orange-500 bg-orange-50/50">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {facebookProviders.length > 0 && (
              <div className="flex-1">
                <Select 
                  value={isMappingFacebook ? "connecting" : ""} 
                  onValueChange={handleConnectFacebook}
                  disabled={isMappingFacebook}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isMappingFacebook ? "Connecting..." : "Connect Facebook"} />
                  </SelectTrigger>
                  <SelectContent>
                    {facebookProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.pageName || provider.pageId || 'Unnamed Account'} 
                        {provider.isPersonal ? ' (Personal)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {linkedinProviders.length > 0 && (
              <div className="flex-1">
                <Select 
                  value={isMappingLinkedin ? "connecting" : ""} 
                  onValueChange={handleConnectLinkedin}
                  disabled={isMappingLinkedin}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isMappingLinkedin ? "Connecting..." : "Connect LinkedIn"} />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedinProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.pageName || provider.pageId || 'Unnamed Account'}
                        {provider.isPersonal ? ' (Personal)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </Alert>
    </div>
  )
}

