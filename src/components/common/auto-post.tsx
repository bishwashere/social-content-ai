"use client"
import React, { useEffect } from 'react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { confirm } from '../ui/alert-dialog'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { checkAuthTokens } from '@/server-actions/check-auth-tokens'
import { useSession } from '@/backend-apis/auth/hooks'
import { schedulePost } from '@/server-actions/schedule-post'
import { DateTimePickerDialog } from './date-picker'

const ICONS = {
  x: "/x.svg"
}

type Props = {
  platform: "x"
  content: string
}

const AutoPost = ({ platform, content }: Props) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false)
  const { data } = useSession()
  const onClick = async () => {
    const shouldPost = await confirm({
      title: `Post to ${platform}?`,
      description: `Are you sure you want to post this content to ${platform}?`
    })

    if (!shouldPost) return
    setIsDatePickerOpen(true)
  }

  const onDone = async (date: Date | undefined) => {

    if (!data?.user) {
      console.error("No user found")
      return
    }

    // if date is past toast a error
    if (!date) {
      toast.error("Date cannot be in the past")
      return
    }

    console.log("date: ", date)

    if (new Date(date) < new Date()) {
      toast.error("Date cannot be in the past")
      return
    }
    setIsDatePickerOpen(false)

    if (platform === "x") {
      const hasTokens = await checkAuthTokens(data?.user?._id, platform)

      if (!hasTokens) {
        toast.loading("You need to sign in to Twitter to post automatically, redirecting...")
        setTimeout(() => {
          signIn("twitter")
        }, 1000);
      } else {
        const res = await schedulePost({
          userId: data?.user?._id,
          platform: "twitter",
          content: content,
          date: new Date(date).getTime() / 1000
        })

        if (res) {
          toast.success("Post scheduled!")
        } else {
          toast.error("Failed to schedule post")
        }
      }
    }
  }

  if (!ICONS[platform]) return null
  return (
    <>
      <DateTimePickerDialog
        value={new Date()}
        open={isDatePickerOpen}
        onOpenChange={setIsDatePickerOpen}
        onConfirm={onDone}
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Button
              onClick={onClick}
              variant={"ghost"} size={"sm"}>
              <img src={ICONS[platform]} alt={platform} className="w-4 h-4" />
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