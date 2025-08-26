"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  FolderOpen,
  Folder,
  ChevronDown,
  ChevronRight,
  PlusCircleIcon,
  Users2Icon,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { useSession } from "@/backend-apis/auth/hooks";
import { ProjectFolder } from "@/backend-apis/project-folders";
import { useDeleteProjectFolder } from "@/backend-apis/project-folders/hooks";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateProjectFolder } from "@/backend-apis/project-folders/hooks";
import { startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface ProjectFolderItemProps {
  folder: ProjectFolder;
  isOpen: boolean;
  onToggle: () => void;
  currentPath: string;
}

export function ProjectFolderItem({
  folder,
  isOpen,
  onToggle,
  currentPath,
}: ProjectFolderItemProps) {
  const router = useRouter();
  const { data } = useSession();
  const { toggleSidebar } = useSidebar();
  const deleteFolder = useDeleteProjectFolder();
  const updateFolder = useUpdateProjectFolder();
  
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [editDescription, setEditDescription] = useState(folder.description || "");
  const [editColor, setEditColor] = useState(folder.color || "#3B82F6");

  const activeProjectId = (path: string) => {
    const match = path.match(/project\/([^/]+)/);
    return match ? match[1] : null;
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete the folder "${folder.name}"? This will remove all projects from the folder but won't delete the projects themselves.`)) {
      await deleteFolder.mutateAsync(folder.id);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    await updateFolder.mutateAsync({
      id: folder.id,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      color: editColor,
    });

    setEditOpen(false);
  };

  const colorOptions = [
    "#3B82F6", "#EF4444", "#10B981", "#F59E0B", 
    "#8B5CF6", "#F97316", "#EC4899", "#06B6D4"
  ];

  // Function to determine if project is active (same formula as dashboard and sidebar)
  const isProjectActive = (project: any) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday end
    
    return (project.projectTrackings || []).some((tracking: any) => {
      const postDate = new Date(tracking.date);
      return isWithinInterval(postDate, { start: weekStart, end: weekEnd });
    });
  };

  // Function to calculate project progress (simplified version)
  const calculateProjectProgress = (project: any): number => {
    if (!project.campaignPlanners || project.campaignPlanners.length === 0) {
      return 0;
    }

    let totalProgress = 0;
    let totalCampaigns = 0;

    project.campaignPlanners.forEach((planner: any) => {
      if (planner.chats && planner.chats.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const baseDate = planner.startDate ? new Date(planner.startDate) : new Date(planner.createdAt);
        baseDate.setHours(0, 0, 0, 0);
        
        const totalDays = planner.chats.length;
        const passedDays = planner.chats.filter((chat: any) => {
          const chatDate = new Date(baseDate.getTime() + (chat.day - 1) * 86400000);
          chatDate.setHours(0, 0, 0, 0);
          return chatDate < today;
        }).length;

        const campaignProgress = totalDays > 0 ? (passedDays / totalDays) * 100 : 0;
        totalProgress += campaignProgress;
        totalCampaigns++;
      }
    });

    return totalCampaigns > 0 ? Math.round(totalProgress / totalCampaigns) : 0;
  };

  // Function to determine folder progress bar color
  const getFolderProgressBarColor = (folder: ProjectFolder) => {
    // Use consistent color for folder overall progress
    return "bg-blue-500";
  };

  // Function to determine project progress bar color (same as sidebar)
  const getProjectProgressBarColor = (project: any) => {
    // Now we have projectTrackings data, use the same logic as sidebar
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday end
    
    const isActive = (project.projectTrackings || []).some((tracking: any) => {
      const postDate = new Date(tracking.date);
      return isWithinInterval(postDate, { start: weekStart, end: weekEnd });
    });

    if (isActive) {
      return "bg-green-500"; // Green for active projects
    } else if (project.campaignPlanners && project.campaignPlanners.length > 0) {
      return "bg-gray-400"; // Grey for inactive projects with campaigns
    } else {
      return "bg-blue-500"; // Blue for projects without campaigns
    }
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="w-[calc(var(--sidebar-width)-1rem)]">
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-gray-200">
              <div className="flex items-center gap-2 truncate flex-1">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: folder.color || "#3B82F6" }}
                />
                {isOpen ? (
                  <FolderOpen className="h-4 w-4 shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0" />
                )}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium truncate">{folder.name}</span>
                  {folder.description && (
                    <span className="text-xs text-gray-400 leading-tight break-words">
                      {folder.description}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-600"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                )}
              </div>
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-1 px-3 py-2">
          {/* Folder Overall Progress */}
          {folder.projectFolderItems.length > 0 && (
            <div className="px-3 py-2 mb-2">
              <div className="text-xs text-gray-600 mb-1">Overall Progress</div>
              <div className="px-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                    style={{ width: `${Math.round(
                      folder.projectFolderItems.reduce((total, item) => 
                        total + calculateProjectProgress(item.project), 0
                      ) / folder.projectFolderItems.length
                    )}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {folder.projectFolderItems.length === 0 ? (
            <div className="text-xs text-gray-500 px-3 py-2">
              No projects in this folder
            </div>
          ) : (
            folder.projectFolderItems.map((item) => (
              <Link
                key={item.id}
                onClick={() => {
                  if (window.innerWidth <= 768) {
                    toggleSidebar();
                  }
                }}
                href={`/project/${item.project.id}`}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                  activeProjectId(currentPath) === item.project.id &&
                  "bg-accent text-accent-foreground",
                )}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-current opacity-60" />
                    <span className="truncate max-w-[150px]">{item.project.name}</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="px-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${getProjectProgressBarColor(item.project)}`}
                        style={{ width: `${calculateProjectProgress(item.project)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Edit Folder Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Folder Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter folder name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter folder description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Folder Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      editColor === colorOption
                        ? "border-gray-800 scale-110"
                        : "border-gray-300 hover:border-gray-500"
                    }`}
                    style={{ backgroundColor: colorOption }}
                    onClick={() => setEditColor(colorOption)}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateFolder.isPending || !editName.trim()}
              >
                {updateFolder.isPending ? "Updating..." : "Update Folder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
