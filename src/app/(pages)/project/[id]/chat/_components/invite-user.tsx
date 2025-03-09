"use client"
import { SendHorizonalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useInviteUserToProject } from "@/backend-apis/projects/hooks"
import { z } from "zod"
import { toast } from "sonner"
import { useParams } from "next/navigation"

export function InviteUserDialog() {
  const { id } = useParams() as { id: string }
  const [email, setEmail] = useState("");
  const invite = useInviteUserToProject()
  const [isOpen, setIsOpen] = useState(false)
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size={"sm"} variant="outline">Invite</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Invite User
          </DialogTitle>
          <DialogDescription>
            Enter the email of the user you want to invite to view this project.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <div className="grid flex-1 gap-2">
            <Label htmlFor="link" className="sr-only">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
          </div>
          <Button
            loading={invite.isPending}
            onClick={async () => {
              if (z.string().email().safeParse(email).success) {
                try {
                  const res = await invite.mutateAsync({ email, projectId: id })
                  if (res) {
                    setIsOpen(false)
                  }
                } catch { }
              } else {
                toast.error("Invalid email")
              }
            }}
            type="submit" size="sm" className="px-3">
            Invite
            <SendHorizonalIcon />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
