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
  const [showAlert, setShowAlert] = useState(false)
  const [facebookProviders, setFacebookProviders] = useState<AvailableProvider[]>([])
  const [linkedinProviders, setLinkedinProviders] = useState<AvailableProvider[]>([])
  const [selectedFacebook, setSelectedFacebook] = useState<string>("")
  const [selectedLinkedin, setSelectedLinkedin] = useState<string>("")
  const [isMapping, setIsMapping] = useState(false)

  const checkAvailableProviders = useCallback(async () => {
    if (!session?.user?.id || !projectId) return

    try {
      // Check Facebook providers
      const fbResult = await checkProjectOAuthProvider(projectId, session.user.id, "facebook")
      
      // Check LinkedIn providers
      const liResult = await checkProjectOAuthProvider(projectId, session.user.id, "linkedin")

      // Show alert if user has providers but none are mapped to this project
      const hasFbAvailable = fbResult.hasProviderConnected && !fbResult.isProjectMapped && fbResult.availableProviders && fbResult.availableProviders.length > 0
      const hasLiAvailable = liResult.hasProviderConnected && !liResult.isProjectMapped && liResult.availableProviders && liResult.availableProviders.length > 0

      if (hasFbAvailable || hasLiAvailable) {
        setShowAlert(true)
        setFacebookProviders(fbResult.availableProviders || [])
        setLinkedinProviders(liResult.availableProviders || [])
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

  const handleConnect = async () => {
    if (!session?.user?.id) return
    if (!selectedFacebook && !selectedLinkedin) {
      toast.error("Please select at least one account to connect")
      return
    }

    setIsMapping(true)
    try {
      // Map Facebook if selected
      if (selectedFacebook) {
        await mapProjectToOAuthProvider(projectId, selectedFacebook, session.user.id)
        toast.success("Facebook account connected to project!")
      }

      // Map LinkedIn if selected
      if (selectedLinkedin) {
        await mapProjectToOAuthProvider(projectId, selectedLinkedin, session.user.id)
        toast.success("LinkedIn account connected to project!")
      }

      // Recheck available providers and hide alert if all are now mapped
      await checkAvailableProviders()
      
      // Reset selections
      setSelectedFacebook("")
      setSelectedLinkedin("")
    } catch (error) {
      console.error("Error mapping provider:", error)
      toast.error("Failed to connect account")
    } finally {
      setIsMapping(false)
    }
  }

  if (!showAlert) return null

  return (
    <div className="px-6 mb-4 max-w-4xl mx-auto">
      <Alert className="border-orange-500 bg-orange-50/50">
        <div className="flex flex-col gap-3">
          <AlertTitle className="text-orange-600 font-semibold flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            No socials are connected to this project
          </AlertTitle>
          
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {facebookProviders.length > 0 && (
              <div className="flex-1 w-full">
                <label className="text-xs text-gray-600 mb-1 block">Connect Facebook</label>
                <Select value={selectedFacebook} onValueChange={setSelectedFacebook}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Facebook account" />
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
              <div className="flex-1 w-full">
                <label className="text-xs text-gray-600 mb-1 block">Connect LinkedIn</label>
                <Select value={selectedLinkedin} onValueChange={setSelectedLinkedin}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select LinkedIn account" />
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

            <Button 
              onClick={handleConnect}
              disabled={isMapping || (!selectedFacebook && !selectedLinkedin)}
              className="whitespace-nowrap"
              size="default"
            >
              {isMapping ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  )
}

