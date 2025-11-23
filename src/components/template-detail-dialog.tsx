"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Template } from "@/backend-apis/templates/index";
import { toast } from "sonner";

interface TemplateDetailDialogProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateDetailDialog({ template, isOpen, onClose }: TemplateDetailDialogProps) {
  const handleUseTemplate = async () => {
    // Copy template content to clipboard
    try {
      await navigator.clipboard.writeText(template.content);
      toast.success("Template copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy template");
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {template.icon && <span className="text-3xl">{template.icon}</span>}
            <DialogTitle className="text-2xl">{template.title}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Preview:</h3>
            <div className="p-4 bg-muted rounded-lg border min-h-[200px] whitespace-pre-wrap">
              {template.content}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleUseTemplate}>
              Use Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
