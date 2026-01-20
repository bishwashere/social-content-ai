"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Users, Folder } from "lucide-react";

export default function ProjectManagementPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FolderKanban className="h-6 w-6 text-blue-600" />
          <h1 className="text-4xl font-bold">Project Management</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Organize projects, collaborate with teams, and manage workflows
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/documentation/project-management/folders">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-blue-600" />
                <CardTitle>Project Folders</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organize projects into custom folders with color coding
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/documentation/project-management/collaboration">
          <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                <CardTitle>Team Collaboration</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Invite team members, manage roles, and collaborate on projects
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
