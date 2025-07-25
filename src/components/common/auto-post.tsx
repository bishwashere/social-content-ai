"use client"
import React from 'react'
import { Button } from '../ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { confirm } from '../ui/alert-dialog'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { checkAuthTokens } from '@/server-actions/check-auth-tokens'
import { useSession } from '@/backend-apis/auth/hooks'
import { schedulePost } from '@/server-actions/schedule-post'
import { DateTimePickerDialog } from './date-picker'
import { Share2Icon, ShareIcon } from 'lucide-react'

const ICONS = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg"
}

type Props = {
  platform: "x" | "facebook" | "linkedin" | "threads"
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
    } else if (platform === "threads") {
      // const hasTokens = await checkAuthTokens(data?.user?._id, platform)

      // if (!hasTokens) {
      //   toast.loading("You need to sign in to Threads to post automatically, redirecting...")
      //   setTimeout(() => {
      //     signIn("threads")
      //   }, 1000);
      // } else {
      //   const res = await schedulePost({
      //     userId: data?.user?._id,
      //     platform: "threads",
      //     content: content,
      //     date: new Date(date).getTime() / 1000
      //   })

      //   if (res) {
      //     toast.success("Post scheduled!")
      //   } else {
      //     toast.error("Failed to schedule post")
      //   }
      // }
    } else if (platform === "facebook") {
      const hasTokens = await checkAuthTokens(data?.user?._id, platform)

      if (!hasTokens) {
        toast.loading("You need to sign in to Facebook to post automatically, redirecting...")
        setTimeout(() => {
          signIn("facebook")
        }, 1000);
      } else {
        const res = await schedulePost({
          userId: data?.user?._id,
          platform: "facebook",
          content: content,
          date: new Date(date).getTime() / 1000
        })

        if (res) {
          toast.success("Post scheduled!")
        } else {
          toast.error("Failed to schedule post")
        }
      }
    } else if (platform === "linkedin") {
      const hasTokens = await checkAuthTokens(data?.user?._id, platform, date)

      if (!hasTokens) {
        toast.loading("You need to sign in to Linkedin to post automatically, redirecting...")
        setTimeout(() => {
          signIn("linkedin")
        }, 1000);
      } else {
        const res = await schedulePost({
          userId: data?.user?._id,
          platform: "linkedin",
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
        value={
          new Date(new Date().getTime() + 60 * 60 * 1000)
        }
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