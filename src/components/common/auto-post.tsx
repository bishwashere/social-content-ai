"use client"
import React from 'react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { checkAuthTokens } from '@/server-actions/check-auth-tokens'
import { useSession } from '@/backend-apis/auth/hooks'
import { schedulePost } from '@/server-actions/schedule-post'
import { DateTimePickerDialog } from './date-picker'
import { Share2Icon } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog'
import FacebookPostView from '../social/facebook-post-view'
import LinkedinPostView from '../social/linkedin-post-view'

const ICONS = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg",
  reddit: "/reddit.svg"
}

type Props = {
  platform: "x" | "facebook" | "linkedin" | "threads" | "reddit"
  content: string
  projectId: string
}

const AutoPost = ({ platform, content, projectId }: Props) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const [isAlertOpen, setIsAlertOpen] = React.useState(false)
  const [isProviderSelectOpen, setIsProviderSelectOpen] = React.useState(false)
  const [availableProviders, setAvailableProviders] = React.useState<Array<{ id: string; pageName?: string | null; pageId?: string | null }> | undefined>()
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

    const platformName = platform === "x" ? "twitter" : platform
    
    try {
      const result = await checkProjectOAuthProvider(projectId, data.user.id, platformName)

      if (!result.hasProviderConnected) {
        // User needs to connect their account first
        toast.loading(`You need to connect your ${platform} account first, redirecting...`)
        setTimeout(() => {
          signIn(platformName)
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
    if (!data?.user?.id) return

    try {
      await mapProjectToOAuthProvider(projectId, providerId, data.user.id)
      setIsProviderSelectOpen(false)
      toast.success('Account mapped to project successfully')
      // Retry the post action
      onClick()
    } catch (error) {
      console.error('Error mapping provider to project:', error)
      toast.error('Failed to map account to project')
    }
  }

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
    if (platform === "x") {
      platformName = "twitter"
    }

    const res = await schedulePost({
      content,
      platform: platformName,
      projectId,
      date: date.toISOString()
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
              {platform === "facebook" && <FacebookPostView content={content} />}
              {platform === "linkedin" && <LinkedinPostView content={content} />}
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
          <Select onValueChange={handleProviderSelect}>
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
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={onClick}
              variant={"ghost"} size={"sm"}>
              <Share2Icon />
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