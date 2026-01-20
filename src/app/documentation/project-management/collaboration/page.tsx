"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, Eye, Edit } from "lucide-react";

export default function CollaborationPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6 text-green-600" />
          <h1 className="text-4xl font-bold">Team Collaboration</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Collaborate with team members on projects
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Invite team members to collaborate on projects with role-based access control.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles & Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium">Admin</p>
                  <p className="text-sm text-muted-foreground">Full control: create, edit, delete, and manage team members</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Edit className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Editor</p>
                  <p className="text-sm text-muted-foreground">Can create and edit content, but cannot delete or manage team</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium">Viewer</p>
                  <p className="text-sm text-muted-foreground">Read-only access to view projects and content</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Invite</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Open a project</li>
              <li>Click &quot;Invite&quot; or go to project settings</li>
              <li>Enter team member email and select role</li>
              <li>Team member receives invitation</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
