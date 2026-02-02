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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateProjectFolder } from "@/backend-apis/project-folders/hooks";
import { useSession } from "@/backend-apis/auth/hooks";
import { useState } from "react";

export function AddFolderButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string | null>(null);
  
  const { data: session } = useSession();
  const createFolder = useCreateProjectFolder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    console.log('Session data:', session);
    console.log('Creating folder with:', { name: name.trim(), description: description.trim() || undefined, color });

    try {
      await createFolder.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        color: color || undefined,
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }

    // Reset form and close dialog
    setName("");
    setDescription("");
    setColor(null);
    setOpen(false);
  };

  const colorOptions = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#F97316", // Orange
    "#EC4899", // Pink
    "#06B6D4", // Cyan
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-center text-sm h-6"
        >
          +
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Project Folder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Folder Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter folder description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Folder Color</Label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className={`w-8 h-8 rounded border-2 transition-all flex items-center justify-center ${
                  !color
                    ? "border-gray-800 scale-110 bg-gray-100"
                    : "border-gray-300 hover:border-gray-500 bg-gray-50"
                }`}
                onClick={() => setColor(null)}
                title="No color"
              >
                <span className="text-xs text-gray-500">×</span>
              </button>
              {colorOptions.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === colorOption
                      ? "border-gray-800 scale-110"
                      : "border-gray-300 hover:border-gray-500"
                  }`}
                  style={{ backgroundColor: colorOption }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </div>
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
              disabled={createFolder.isPending || !name.trim()}
            >
              {createFolder.isPending ? "Creating..." : "Create Folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
