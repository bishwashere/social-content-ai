"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Folder, Palette } from "lucide-react";

export default function ProjectFoldersPage() {
  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="h-6 w-6 text-blue-600" />
          <h1 className="text-4xl font-bold">Project Folders</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Organize your projects with custom folders
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Project Folders help you organize and categorize your projects for better workflow management.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li><strong>Custom Folders:</strong> Create folders with custom names and descriptions</li>
              <li><strong>Color Coding:</strong> Assign colors to folders for visual organization</li>
              <li><strong>Project Organization:</strong> Add projects to folders for better categorization</li>
              <li><strong>Easy Management:</strong> Edit, delete, and reorganize folders anytime</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Click "Create Folder" in the project sidebar</li>
              <li>Enter folder name, description, and choose a color</li>
              <li>Add existing projects to folders using the folder icon</li>
              <li>Access projects from both main list and folders</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
