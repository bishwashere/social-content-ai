"use client";
import { SendHorizonalIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useGetAllProjects, useInviteUserToProject } from "@/backend-apis/projects/hooks";
import { z } from "zod";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { INVITED_USER_ROLES } from "@/constants/common";
import { ProjectWithChats } from "@/backend-apis/projects/types";

export function InviteUserDialog() {
  const [role, setRole] = useState(INVITED_USER_ROLES.VIEWER);
  const { id } = useParams() as { id: string };
  const [email, setEmail] = useState("");
  const invite = useInviteUserToProject();
  const [isOpen, setIsOpen] = useState(false);
  const { data: projects, isLoading: projectsLoading } = useGetAllProjects();
  const [invitedUsers, setInvitedUsers] = useState<ProjectWithChats["invitedUsers"]>([]);

  useEffect(() => {
    if (projectsLoading) return;
    if (projects) {
      const project = projects.find(project => project.id === id);
      if (project?.invitedUsers && project.invitedUsers.length > 0) {
        setInvitedUsers(project.invitedUsers);
      }
      // Set current user role for this project
      if (project?.userRole) {
        setCurrentUserRole(project.userRole);
      }
    }
  }, [projects, projectsLoading, id])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size={"sm"} variant="outline">
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogClose />
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
          <DialogDescription>
            Enter the email of the user you want to invite to view this project.
          </DialogDescription>
          {currentUserRole && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Your role:</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                currentUserRole === "admin" 
                  ? "bg-blue-100 text-blue-800" 
                  : currentUserRole === "editor"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
              </span>
            </div>
          )}
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
          <Select onValueChange={(value) => setRole(value)} value={role}>
            <SelectTrigger className="w-[150px] capitalize">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(INVITED_USER_ROLES)
                .filter(role => role !== "admin") // Only admins can assign admin role
                .map((value, i) => (
                  <SelectItem key={i} value={value} className="capitalize">
                    {value}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="ml-auto">
          {currentUserRole === "admin" ? (
            <Button
              loading={invite.isPending}
              onClick={async () => {
                if (z.string().email().safeParse(email).success) {
                  try {
                    const res = await invite.mutateAsync({
                      email,
                      projectId: id,
                      role,
                    });
                    if (res) {
                      setIsOpen(false);
                      setEmail("");
                    }
                  } catch { }
                } else {
                  toast.error("Invalid email");
                }
              }}
              type="submit"
              size="sm"
              className="px-3"
            >
              Invite
              <SendHorizonalIcon />
            </Button>
          ) : (
            <div className="text-sm text-gray-500">
              Only admins can invite users
            </div>
          )}
        </DialogFooter>
        {invitedUsers && invitedUsers.length > 0 &&
          <div>
            <p className="font-medium underline underline-offset-2">Invited Users</p>
            <ol className="list-disc ml-4 text-sm">
              {
                invitedUsers.filter(user => user.user).map(user => (
                  <li key={user.id}>
                    {user.user?.name || 'Unknown'} - {user.user?.email || 'No email'} - {user.role}
                  </li>
                ))
              }
            </ol>
          </div>}
      </DialogContent>
    </Dialog>
  );
}
