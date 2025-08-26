"use client";

import * as React from "react";
import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAddProjectToFolder } from "@/backend-apis/project-folders/hooks";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { useGetProjectFolders } from "@/backend-apis/project-folders/hooks";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface AddProjectToFolderProps {
  projectId: string;
  projectName: string;
}

export function AddProjectToFolder({ projectId, projectName }: AddProjectToFolderProps) {
  const [open, setOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  
  const addProjectToFolder = useAddProjectToFolder();
  const { data: folders, isLoading: foldersLoading } = useGetProjectFolders();
  const { data: projects } = useGetAllProjects();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFolderId) return;

    await addProjectToFolder.mutateAsync({
      folderId: selectedFolderId,
      projectId,
    });

    // Reset and close dialog
    setSelectedFolderId("");
    setOpen(false);
  };

  // Filter out folders that already contain this project
  const availableFolders = folders?.filter((folder: any) => 
    !folder.projectFolderItems.some((item: any) => item.projectId === projectId)
  ) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-300"
          onClick={(e) => e.stopPropagation()}
        >
          <FolderPlus className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add "{projectName}" to Folder</DialogTitle>
        </DialogHeader>
        
        {foldersLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : availableFolders.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>No available folders to add this project to.</p>
            <p className="text-sm mt-1">Create a new folder first!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder">Select Folder</Label>
              <select
                id="folder"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Choose a folder...</option>
                {availableFolders.map((folder: any) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                    {folder.description && ` - ${folder.description}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addProjectToFolder.isPending || !selectedFolderId}
              >
                {addProjectToFolder.isPending ? "Adding..." : "Add to Folder"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
