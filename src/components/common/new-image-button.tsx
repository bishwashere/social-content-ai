"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImagePlus, RefreshCw, Type, Sparkles } from "lucide-react";

interface NewImageButtonProps {
  onTextCard: () => Promise<void>;
  onAIImage: () => Promise<void>;
  isTextCardPending: boolean;
  isAIImagePending: boolean;
  disabled?: boolean;
  /** If true, shows "Regenerate Image" instead of "New Image" */
  hasExistingImage?: boolean;
  /** If true, button spans full width */
  fullWidth?: boolean;
}

export function NewImageButton({
  onTextCard,
  onAIImage,
  isTextCardPending,
  isAIImagePending,
  disabled,
  hasExistingImage = false,
  fullWidth = true,
}: NewImageButtonProps) {
  const [open, setOpen] = useState(false);
  const isPending = isTextCardPending || isAIImagePending;

  const handleTextCard = async () => {
    setOpen(false);
    await onTextCard();
  };

  const handleAIImage = async () => {
    setOpen(false);
    await onAIImage();
  };

  const Icon = hasExistingImage ? RefreshCw : ImagePlus;
  const label = hasExistingImage ? "Regenerate Image" : "Create Image";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isPending}
          className={fullWidth ? "w-full justify-center" : ""}
          title={hasExistingImage ? "Regenerate image" : "Create image"}
        >
          <Icon className="h-4 w-4 mr-1" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[200px]">
        <DropdownMenuItem
          onClick={handleTextCard}
          disabled={isTextCardPending}
          className="cursor-pointer"
        >
          <Type className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Text Card</span>
            <span className="text-xs text-muted-foreground">Free • Styled text overlay</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleAIImage}
          disabled={isAIImagePending}
          className="cursor-pointer"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>AI Image</span>
            <span className="text-xs text-muted-foreground">1 credit • AI generated</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
