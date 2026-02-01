"use client"
import React from 'react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { useSession } from '@/backend-apis/auth/hooks'
import { schedulePost } from '@/server-actions/schedule-post'
import { DateTimePickerDialog } from './date-picker'
import { Send } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { mapProjectToOAuthProvider } from '@/server-actions/map-project-oauth-provider'
import { checkProjectOAuthProvider } from '@/server-actions/check-project-oauth-provider'
import { authenticateWithThreads } from '@/lib/auth/threads'
import { PLATFORM_IDS, PLATFORM_ICONS, type PlatformId } from '@/constants/platforms'

// Use centralized platform icons
const ICONS = PLATFORM_ICONS

type Props = {
  platform: PlatformId
  content: string
  projectId: string
  mediaUrl?: string
}

const AutoPost = ({ platform, content, projectId, mediaUrl }: Props) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const [isAlertOpen, setIsAlertOpen] = React.useState(false)
  const [isProviderSelectOpen, setIsProviderSelectOpen] = React.useState(false)
  const [selectedProvider, setSelectedProvider] = React.useState<string>('')
  const [availableProviders, setAvailableProviders] = React.useState<Array<{ id: string; pageName?: string | null; pageId?: string | null; isStandalone?: boolean }> | undefined>()
  const { data } = useSession()

  const onClick = async () => {
    const authResult = await checkIfAuthenticated()
    if (!authResult) return
    setIsAlertOpen(true)
  }

  const handleAction = (action: 'now' | 'schedule' | false) => {
    setIsAlertOpen(false)
    if (!action) return

    if (action === 'now') {
      // Schedule for 1 minute before now
      const date = new Date()
      date.setMinutes(date.getMinutes() - 1)
      onDone(date, true)
    } else if (action === 'schedule') {
      setIsDatePickerOpen(true)
    }
  }

  const checkIfAuthenticated = async () => {
    if (!data?.user?.id) {
      toast.error("You need to sign in to post automatically")
      return false
    }

    const platformName = platform === PLATFORM_IDS.X ? "twitter" : platform

    try {
      const result = await checkProjectOAuthProvider(projectId, data.user.id, platformName)
      console.log(result)
      if (!result.hasProviderConnected) {
        // User needs to connect their account first
        if (platform === PLATFORM_IDS.INSTAGRAM) {
          // Instagram requires connecting via Facebook (for Business/Creator accounts)
          toast.error("Instagram posting requires a Business account. Please connect via Facebook first.", {
            description: "Go to Settings → Connect Facebook. Make sure your Facebook Page has an Instagram Business account linked.",
            duration: 8000,
          })
          return false
        }
        
        toast.loading(`You need to connect your ${platform} account first, redirecting...`)
        setTimeout(() => {
          if (platform === PLATFORM_IDS.THREADS) {
            authenticateWithThreads()
          } else if (platform === PLATFORM_IDS.LINKEDIN) {
            const currentUrl = window.location.href;
            window.location.href = `/api/linkedin-login/auth?redirectTo=${encodeURIComponent(currentUrl)}`;
          }
          else {
            signIn(platformName)
          }
        }, 1000)
        return false
      }

      if (!result.isProjectMapped && result.availableProviders && result.availableProviders.length > 0) {
        // Show provider selection dialog
        setAvailableProviders(result.availableProviders)
        setIsProviderSelectOpen(true)
        return false
      } else if (!result.isProjectMapped) {
        // No providers available to map
        toast.error(`No ${platform} accounts available to map to this project`)
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking project OAuth provider:', error)
      toast.error('Failed to verify authentication status')
      return false
    }
  }

  const handleProviderSelect = async (providerId: string) => {
    if (!data?.user?.id || !providerId) return;

    try {
      await mapProjectToOAuthProvider(projectId, providerId, data.user.id);
      setIsProviderSelectOpen(false);
      setSelectedProvider('');
      toast.success('Account mapped to project successfully');
      // Retry the post action
      onClick();
    } catch (error) {
      console.error('Error mapping provider to project:', error);
      toast.error('Failed to map account to project');
    }
  };

  const onDone = async (date: Date | undefined, isNow?: boolean) => {
    if (!data?.user) {
      console.error("No user found")
      return
    }

    if (!date) {
      toast.error("Date cannot be in the past")
      return
    }

    // it is ok if 5 minutes in past
    if (new Date(date).getTime() < new Date().getTime() - 5 * 60 * 1000) {
      toast.error("Date cannot be in the past")
      return
    }
    setIsDatePickerOpen(false)

    let platformName = platform as string
    if (platform === PLATFORM_IDS.X) {
      platformName = "twitter"
    }

    const res = await schedulePost({
      content,
      platform: platformName,
      projectId,
      date: date.toISOString(),
      ...(mediaUrl && { media: mediaUrl })
    })

    if (!res) {
      toast.error("Failed to schedule post")
    } else {
      //trigger post for now
      if (isNow) {
        fetch("/api/post")
      }
      toast.success(isNow ? "Post will be posted now!" : "Post scheduled for later")
    }
  }

  if (!ICONS[platform]) return null

  return (
    <>
      <DateTimePickerDialog
        value={new Date(new Date().getTime() + 60 * 60 * 1000)}
        open={isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        onConfirm={onDone}
      />
      <AlertDialog
        open={isAlertOpen}
        onOpenChange={(open) => !open && handleAction(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Post to ${platform}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              Choose whether to post now or schedule for later
              {/* <div className='flex'>
              {platform === PLATFORM_IDS.FACEBOOK && <FacebookPostView content={content} />}
              {platform === PLATFORM_IDS.LINKEDIN && <LinkedinPostView content={content} />}
              </div> */}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleAction(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              onClick={() => handleAction('now')}>
              Post Now
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleAction('schedule')}
            >
              Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isProviderSelectOpen} onOpenChange={setIsProviderSelectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Select Account</AlertDialogTitle>
            <AlertDialogDescription>
              Choose which {platform} account to use for this project
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Select onValueChange={(value) => setSelectedProvider(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {availableProviders?.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.pageName || provider.pageId || 'Unnamed Account'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsProviderSelectOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleProviderSelect(selectedProvider)}>
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={onClick}
              variant={"ghost"} size={"sm"}>
              <Send />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Publish to {platform} automatically!
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  )
}

export default AutoPost