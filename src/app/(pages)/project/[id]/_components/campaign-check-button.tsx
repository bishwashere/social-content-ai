import { useToggleMarkAsComplete } from '@/backend-apis/campaign-planner/hooks'
import { confirm } from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import React, { useEffect, useState } from 'react'

type Props = {
  campaign: {
    id: string
  }
  timeline: {
    completed: boolean
    day: number
  }
}

const CampaignCheckButton = (props: Props) => {
  const [isCompleted, setIsCompleted] = useState(props.timeline.completed)
  const toggle = useToggleMarkAsComplete()
  useEffect(() => {
    setIsCompleted(props.timeline.completed)
  }, [props.timeline.completed])

  return (
    <Checkbox
      disabled={toggle.isPending}
      checked={isCompleted}
      className='data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500'
      onCheckedChange={async (checked) => {
        const yes = await confirm({
          title: `Do you want to mark this day as ${checked ? "done" : "undone"}?`,
          description: ""
        })
        if (!yes) return;
        setIsCompleted(Boolean(checked))
        try {
          const data = await toggle.mutateAsync({
            campaignId: props.campaign.id,
            day: props.timeline.day.toString(),
          })

          if (typeof data === "boolean") {
            setIsCompleted(data)
          }
        } catch {
          setIsCompleted(!Boolean(checked))
        }
      }}
    />
  )
}

export { CampaignCheckButton }