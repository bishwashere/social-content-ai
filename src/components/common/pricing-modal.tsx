"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, FolderKanban, CheckCircle2 } from "lucide-react"
import { useCreateCheckoutSession, useManageSubscription } from "@/backend-apis/payment/hooks"
import { useRouter } from "next/navigation"
import { useLogout, useSession } from "@/backend-apis/auth/hooks"
import { useEffect } from "react"
import { isSubscriptionExpired } from "@/lib/sub"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export default function PricingModal({ open, setOpen }: Props) {
  const payment = useCreateCheckoutSession()
  const manage = useManageSubscription()
  const router = useRouter()
  const { data } = useSession()
  const logout = useLogout()

  // only open the modal if the user doesn't have a subscription to give trial
  useEffect(() => {
    // open the modal if the user doesn't have a subscription or has claimed free trial or subscription is expired
    if (!data?.subscription || !data?.user?.hasClaimedFreeTrial || isSubscriptionExpired(data.subscription.endsAt).isExpired
    ) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }, [data?.subscription, data?.user?.hasClaimedFreeTrial, setOpen])

  return (
    <Dialog open={open}   >
      <DialogContent className="sm:max-w-md">
        <DialogClose onClick={() => {
          logout.mutate()
        }} />
        <DialogHeader>
          <DialogTitle>Pro</DialogTitle>
          <DialogDescription>Go Pro!</DialogDescription>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                $10<span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
              {!data?.user?.hasClaimedFreeTrial && <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-3">7-day free trial</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <FolderKanban className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited projects</p>
                  <p className="text-sm text-muted-foreground">Create as many projects as you need</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited user management</p>
                  <p className="text-sm text-muted-foreground">Invite unlimited users to manage projects</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited viewers</p>
                  <p className="text-sm text-muted-foreground">Invite unlimited users to view projects</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unlimited completions</p>
                  <p className="text-sm text-muted-foreground">Ample capacity for your workflow</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              loading={payment.isPending || manage.isPending}
              onClick={async () => {
                try {

                  if (data?.subscription && isSubscriptionExpired(data.subscription.endsAt).isExpired) {
                    try {
                      const res = await manage.mutateAsync()
                      router.push(res.data.url)

                    } catch {
                      const res = await payment.mutateAsync()
                      router.push(res.data.redirectUrl)
                    }
                  } else {
                    const res = await payment.mutateAsync()
                    router.push(res.data.redirectUrl)
                  }


                } catch { }
              }}
              className="w-full">
              {payment.isSuccess || manage.isSuccess

                ? "Redirecting..." :

                data?.subscription && !isSubscriptionExpired(data.subscription.endsAt).isExpired ? "Renew" :

                  "Go Pro!"}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

