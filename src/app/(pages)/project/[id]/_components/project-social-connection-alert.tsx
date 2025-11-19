"use client"

import { useEffect, useState, useCallback } from "react"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useSession } from "@/backend-apis/auth/hooks"
import { checkProjectOAuthProvider } from "@/server-actions/check-project-oauth-provider"
import { mapProjectToOAuthProvider } from "@/server-actions/map-project-oauth-provider"
import { toast } from "sonner"
import { X } from "lucide-react"
import Image from "next/image"
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query"
import { getFirstViewTooltip, updateFirstViewTooltip } from "@/server-actions/first-view-tooltip/actions"

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
  const [showFacebookDropdown, setShowFacebookDropdown] = useState(false)
  const [showLinkedinDropdown, setShowLinkedinDropdown] = useState(false)
  const [facebookProviders, setFacebookProviders] = useState<AvailableProvider[]>([])
  const [linkedinProviders, setLinkedinProviders] = useState<AvailableProvider[]>([])
  const [isMappingFacebook, setIsMappingFacebook] = useState(false)
  const [isMappingLinkedin, setIsMappingLinkedin] = useState(false)

  // Check if user has dismissed this alert for this project
  const { data: tooltipData } = useQuery({
    queryKey: ["first-view-tooltip", session?.user?.id],
    queryFn: () => getFirstViewTooltip(session?.user?.id || ""),
    enabled: !!session?.user?.id,
  })

  const dismissAlertMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) return

      const currentDismissed = tooltipData?.dismissedProjectAlerts || []
      await updateFirstViewTooltip({
        userId: session.user.id,
        updateData: {
          dismissedProjectAlerts: [...currentDismissed, projectId],
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["first-view-tooltip", session?.user?.id] })
      setShowAlert(false)
    },
  })

  const checkAvailableProviders = useCallback(async () => {
    if (!session?.user?.id || !projectId) return

    try {
      // Check Facebook providers
      const fbResult = await checkProjectOAuthProvider(projectId, session.user.id, "facebook")
      
      // Check LinkedIn providers
      const liResult = await checkProjectOAuthProvider(projectId, session.user.id, "linkedin")

      // Simple logic: If Facebook is mapped to this project, don't show Facebook dropdown
      const showFacebook = !fbResult.isProjectMapped && (fbResult.availableProviders || []).length > 0
      const showLinkedin = !liResult.isProjectMapped && (liResult.availableProviders || []).length > 0

      setShowFacebookDropdown(showFacebook)
      setShowLinkedinDropdown(showLinkedin)
      setFacebookProviders(fbResult.availableProviders || [])
      setLinkedinProviders(liResult.availableProviders || [])

      // Check if alert has been dismissed for this project
      const isDismissed = tooltipData?.dismissedProjectAlerts?.includes(projectId) || false

      // Show alert only if at least one dropdown should show AND not dismissed
      if ((showFacebook || showLinkedin) && !isDismissed) {
        setShowAlert(true)
      } else {
        setShowAlert(false)
      }
    } catch (error) {
      console.error("Error checking available providers:", error)
    }
  }, [projectId, session?.user?.id, tooltipData])

  useEffect(() => {
    checkAvailableProviders()
  }, [checkAvailableProviders])

  const handleConnectFacebook = async (providerId: string) => {
    if (!session?.user?.id || !providerId) return

    setIsMappingFacebook(true)
    try {
      await mapProjectToOAuthProvider(projectId, providerId, session.user.id)
      toast.success("Facebook account connected to project!")
      
      // Immediately hide Facebook dropdown
      setShowFacebookDropdown(false)
      
      // Invalidate header's connected accounts cache
      queryClient.invalidateQueries({ queryKey: ["connected-accounts", session.user.id] })
      
      // Recheck to update state
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
      
      // Immediately hide LinkedIn dropdown
      setShowLinkedinDropdown(false)
      
      // Invalidate header's connected accounts cache
      queryClient.invalidateQueries({ queryKey: ["connected-accounts", session.user.id] })
      
      // Recheck to update state
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
      <Alert className="border-orange-500 bg-orange-50/50 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 hover:bg-orange-100"
          onClick={() => dismissAlertMutation.mutate()}
        >
          <X className="h-4 w-4 text-orange-600" />
        </Button>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 pr-8">
            {showFacebookDropdown && facebookProviders.length > 0 && (
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

            {showLinkedinDropdown && linkedinProviders.length > 0 && (
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

