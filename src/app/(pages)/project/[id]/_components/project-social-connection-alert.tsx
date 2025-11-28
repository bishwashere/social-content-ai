"use client"

import { useEffect, useState, useCallback } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useSession } from "@/backend-apis/auth/hooks"
import { checkAllProjectOAuthProviders } from "@/server-actions/check-project-oauth-provider"
import { mapProjectToOAuthProvider } from "@/server-actions/map-project-oauth-provider"
import { toast } from "sonner"
import { X } from "lucide-react"
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query"
import { getFirstViewTooltip, updateFirstViewTooltip } from "@/server-actions/first-view-tooltip/actions"
import { OauthPlatform } from "@prisma/client"

type AvailableProvider = {
  id: string
  pageName?: string | null
  pageId?: string | null
  isPersonal?: boolean
}

type PlatformState = {
  showDropdown: boolean
  providers: AvailableProvider[]
  isMapping: boolean
}

type Props = {
  projectId: string
}

const SUPPORTED_PLATFORMS: OauthPlatform[] = [
  "facebook",
  "linkedin",
  "twitter",
  "reddit",
  "tiktok",
  "threads",
  "instagram"
]

const PLATFORM_LABELS: Record<OauthPlatform, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  twitter: "Twitter",
  reddit: "Reddit",
  tiktok: "TikTok",
  threads: "Threads",
  instagram: "Instagram"
}

export function ProjectSocialConnectionAlert({ projectId }: Props) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showAlert, setShowAlert] = useState(false)
  const [platformStates, setPlatformStates] = useState<Record<OauthPlatform, PlatformState>>(
    SUPPORTED_PLATFORMS.reduce((acc, platform) => ({
      ...acc,
      [platform]: { showDropdown: false, providers: [], isMapping: false }
    }), {} as Record<OauthPlatform, PlatformState>)
  )

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
      // Single function call to check all platforms at once
      const results = await checkAllProjectOAuthProviders(
        projectId,
        session.user.id,
        SUPPORTED_PLATFORMS
      )

      const newPlatformStates = { ...platformStates }
      let hasAnyDropdown = false

      SUPPORTED_PLATFORMS.forEach(platform => {
        const result = results[platform]
        const showDropdown = !result.isProjectMapped && (result.availableProviders || []).length > 0

        newPlatformStates[platform] = {
          showDropdown,
          providers: result.availableProviders || [],
          isMapping: false
        }

        if (showDropdown) {
          hasAnyDropdown = true
        }
      })

      setPlatformStates(newPlatformStates)

      // Check if alert has been dismissed for this project
      const isDismissed = tooltipData?.dismissedProjectAlerts?.includes(projectId) || false

      // Show alert only if at least one dropdown should show AND not dismissed
      if (hasAnyDropdown && !isDismissed) {
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

  const handleConnectPlatform = async (platform: OauthPlatform, providerId: string) => {
    if (!session?.user?.id || !providerId) return

    setPlatformStates(prev => ({
      ...prev,
      [platform]: { ...prev[platform], isMapping: true }
    }))

    try {
      await mapProjectToOAuthProvider(projectId, providerId, session.user.id)
      toast.success(`${PLATFORM_LABELS[platform]} account connected to this project`)

      // Immediately hide platform dropdown
      setPlatformStates(prev => ({
        ...prev,
        [platform]: { ...prev[platform], showDropdown: false, isMapping: false }
      }))

      // Invalidate header's connected accounts cache
      queryClient.invalidateQueries({ queryKey: ["connected-accounts", session.user.id] })

      // Recheck to update state
      await checkAvailableProviders()
    } catch (error) {
      console.error(`Error mapping ${platform} provider:`, error)
      toast.error(`Failed to connect ${PLATFORM_LABELS[platform]} account`)

      setPlatformStates(prev => ({
        ...prev,
        [platform]: { ...prev[platform], isMapping: false }
      }))
    }
  }

  // Don't show anything if platforms are already connected or no unmapped providers
  if (!showAlert) return null

  const visiblePlatforms = SUPPORTED_PLATFORMS.filter(
    platform => platformStates[platform].showDropdown && platformStates[platform].providers.length > 0
  )

  if (visiblePlatforms.length === 0) return null

  return (
    <div className="px-6 mb-4 max-w-4xl mx-auto">
      <Alert className="border-orange-500 bg-orange-50/50 w-full relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 hover:bg-orange-100"
          onClick={() => dismissAlertMutation.mutate()}
        >
          <X className="h-4 w-4 text-orange-600" />
        </Button>
        <AlertDescription className="w-full">
          <div className="flex items-center gap-3 pr-8 flex-wrap">
            {visiblePlatforms.map(platform => {
              const state = platformStates[platform]
              return (
                <div key={platform} className="min-w-[200px]">
                  <Select
                    value={state.isMapping ? "connecting" : ""}
                    onValueChange={(providerId) => handleConnectPlatform(platform, providerId)}
                    disabled={state.isMapping}
                  >
                    <SelectTrigger className="w-full focus:outline-none">
                      <SelectValue
                        placeholder={state.isMapping ? "Connecting..." : `Connect ${PLATFORM_LABELS[platform]}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {state.providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.pageName || provider.pageId || 'Unnamed Account'}
                          {provider.isPersonal ? ' (Personal)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
            })}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}