"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, FolderKanban, CheckCircle2 } from "lucide-react"
import { useCreateCheckoutSession } from "@/backend-apis/checkout/hooks"
import { useRouter } from "next/navigation"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
}

export default function PricingModal({ open, setOpen }: Props) {
  const payment = useCreateCheckoutSession()
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
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
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20 px-3">7-day free trial</Badge>
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
                  <p className="font-medium">100 completions per month</p>
                  <p className="text-sm text-muted-foreground">Ample capacity for your workflow</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              loading={payment.isPending}
              onClick={async () => {
                try {
                  const res = await payment.mutateAsync()
                  console.log(res)
                  setOpen(false)
                  router.push(res.data.redirectUrl)
                } catch { }
              }}
              className="w-full">Go Pro!</Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

