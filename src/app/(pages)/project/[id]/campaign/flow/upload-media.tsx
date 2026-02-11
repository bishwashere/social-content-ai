import { useUploadMediaForCampaignChat } from "@/backend-apis/video-generation/hooks"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export const UploadMediaToCampaignChat = ({
  campaignId,
  day,
  platform,
  media,
  mediaPreviewUrl,
  onMediaUploaded,
}: {
  campaignId: string
  day: number
  platform: string
  media?: string | null
  mediaPreviewUrl?: string | null // Signed URL for preview (used for AI-generated images)
  onMediaUploaded: (key: string) => void
}) => {
  const upload = useUploadMediaForCampaignChat()
  const inputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<{ url: string; type: "img" | "video" } | null>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Clean up local preview URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (localPreview?.url) {
        URL.revokeObjectURL(localPreview.url)
      }
    }
  }, [localPreview])

  // Determine what to show for thumbnail
  // Priority: localPreview (just uploaded) > mediaPreviewUrl (AI-generated) > media (signed URL from server)
  const previewUrl = localPreview?.url || mediaPreviewUrl || media
  // Check if previewUrl is a valid URL (signed URL or blob URL)
  const isValidPreviewUrl = previewUrl?.includes("http") || previewUrl?.startsWith("blob:")

  const renderThumbnail = (clickable: boolean = true) => {
    const baseClasses = "w-16 h-16 object-cover rounded border"
    const clickableClasses = clickable ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
    const handleClick = clickable ? () => setIsDialogOpen(true) : undefined

    if (localPreview) {
      return localPreview.type === "img" ? (
        <img 
          src={localPreview.url} 
          alt="Uploaded media" 
          className={`${baseClasses} ${clickableClasses}`}
          onClick={handleClick}
        />
      ) : (
        <video 
          src={localPreview.url} 
          className={`${baseClasses} ${clickableClasses}`}
          onClick={handleClick}
        />
      )
    }
    
    if (isValidPreviewUrl && previewUrl) {
      if (!imgFailed) {
        return (
          <img 
            src={previewUrl} 
            alt="Uploaded media" 
            className={`${baseClasses} ${clickableClasses}`}
            onError={() => setImgFailed(true)}
            onClick={handleClick}
            style={{ display: imgFailed ? 'none' : 'block' }}
          />
        )
      }
      if (imgFailed && !videoFailed) {
        return (
          <video 
            src={previewUrl} 
            className={`${baseClasses} ${clickableClasses}`}
            onError={() => setVideoFailed(true)}
            onClick={handleClick}
          />
        )
      }
    }

    return (
      <div className={`${baseClasses} bg-muted flex items-center justify-center text-xs text-muted-foreground`}>
        Media
      </div>
    )
  }

  const renderFullSize = () => {
    if (localPreview) {
      return localPreview.type === "img" ? (
        <img 
          src={localPreview.url} 
          alt="Uploaded media" 
          className="max-w-full max-h-[80vh] object-contain rounded"
        />
      ) : (
        <video 
          src={localPreview.url} 
          controls
          className="max-w-full max-h-[80vh] object-contain rounded"
        />
      )
    }
    
    if (isValidPreviewUrl && previewUrl) {
      if (!imgFailed) {
        return (
          <img 
            src={previewUrl} 
            alt="Uploaded media" 
            className="max-w-full max-h-[80vh] object-contain rounded"
          />
        )
      }
      if (imgFailed && !videoFailed) {
        return (
          <video 
            src={previewUrl} 
            controls
            className="max-w-full max-h-[80vh] object-contain rounded"
          />
        )
      }
    }

    return null
  }

  return (
    <div className="flex flex-col gap-2 items-start">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={async (e) => {
          try {
            const file = e.target.files?.[0]
            if (!file) return

            // Create local preview immediately
            const objectUrl = URL.createObjectURL(file)
            const fileType = file.type.startsWith("video/") ? "video" : "img"
            setLocalPreview({ url: objectUrl, type: fileType })
            setImgFailed(false)
            setVideoFailed(false)

            const key = await upload.mutateAsync({ 
              file,
              campaignId,
              day,
              platform
            })

            onMediaUploaded(key)
          } catch {
            toast.error("Upload failed")
            setLocalPreview(null)
          }
        }}
      />

      <Button
        loading={upload.isPending}
        onClick={() => inputRef.current?.click()}
        variant="outline"
        size="sm"
      >
        {(media || localPreview) ? "Replace Media" : "Upload Media"}
      </Button>

      {previewUrl && (
        <div className="mt-1">
          {renderThumbnail()}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl flex items-center justify-center p-4" aria-describedby={undefined}>
          <VisuallyHidden>
            <DialogTitle>Media Preview</DialogTitle>
          </VisuallyHidden>
          {renderFullSize()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
