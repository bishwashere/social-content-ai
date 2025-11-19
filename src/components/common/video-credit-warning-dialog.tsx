"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useSession } from "@/backend-apis/auth/hooks"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getFirstViewTooltip, updateFirstViewTooltip } from "@/server-actions/first-view-tooltip/actions"
import { Coins } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function VideoCreditWarningDialog({ open, onOpenChange, onConfirm }: Props) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const { data: tooltipData } = useQuery({
    queryKey: ["first-view-tooltip", session?.user?.id],
    queryFn: () => getFirstViewTooltip(session?.user?.id || ""),
    enabled: !!session?.user?.id,
  })

  const updateTooltip = useMutation({
    mutationFn: async (updateData: { videoGeneration: boolean }) => {
      if (!session?.user?.id) return
      return updateFirstViewTooltip({
        userId: session.user.id,
        updateData,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["first-view-tooltip", session?.user?.id] })
    },
  })

  const handleConfirm = async () => {
    if (dontShowAgain) {
      await updateTooltip.mutateAsync({ videoGeneration: true })
    }
    onOpenChange(false)
    onConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-full">
              <Coins className="h-5 w-5 text-purple-600" />
            </div>
            Video Generation Cost
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            Creating a video will deduct <strong className="text-purple-600 font-bold">2 credits</strong> from your account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Credits are only deducted when you click the <strong>&quot;Generate&quot;</strong> button to submit your video for processing.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dont-show" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <Label 
              htmlFor="dont-show" 
              className="text-sm font-normal cursor-pointer"
            >
              Don&apos;t show this message again
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleConfirm}
            className="bg-purple-600 hover:bg-purple-700"
          >
            OK, Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

