"use client"
import { SendHorizonalIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { INVITED_USER_ROLES } from "@/constants/common"

export function InviteUserDialog() {
  const [role, setRole] = useState(INVITED_USER_ROLES.EDITOR)
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
        <DialogClose />
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
          <Select
            onValueChange={(value) => setRole(value)}
            value={role}
          >
            <SelectTrigger className="w-[150px] capitalize">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {
                Object.values(INVITED_USER_ROLES).map((value, i) => (
                  <SelectItem key={i} value={value} className="capitalize">{value}</SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="ml-auto">
          <Button
            loading={invite.isPending}
            onClick={async () => {
              if (z.string().email().safeParse(email).success) {
                try {
                  const res = await invite.mutateAsync({ email, projectId: id, role })
                  if (res) {
                    setIsOpen(false)
                    setEmail("")
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
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
