"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface UploadImageButtonProps {
  onUpload: (file: File) => Promise<void>;
  isPending: boolean;
  disabled?: boolean;
  hasExistingImage?: boolean;
}

export function UploadImageButton({
  onUpload,
  isPending,
  disabled,
  hasExistingImage = false,
}: UploadImageButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Please upload an image or video file");
      return;
    }

    await onUpload(file);
    
    // Reset input so same file can be selected again
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const label = hasExistingImage ? "Upload Different" : "Upload Image";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || isPending}
        loading={isPending}
        className="w-full justify-center"
        onClick={() => inputRef.current?.click()}
        title={hasExistingImage ? "Upload a different image" : "Upload your own image"}
      >
        <Upload className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </>
  );
}
