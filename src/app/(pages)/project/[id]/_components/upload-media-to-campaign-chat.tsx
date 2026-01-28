import { useUploadMediaForCampaignChat } from "@/backend-apis/video-generation/hooks"
import { ViewMedia } from "@/components/social/view-media"
import { Button } from "@/components/ui/button"
import { useRef } from "react"
import { toast } from "sonner"

export const UploadMediaToCampaignChat = ({
  campaignId,
  day,
  platform,
  media,
  onMediaUploaded,
}: {
  campaignId: string
  day: number
  platform: string
  media?: string | null
  onMediaUploaded: (key: string) => void
}) => {
  const upload = useUploadMediaForCampaignChat()
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {media && <ViewMedia post={{ media }} showMedia />}
      <div className="flex flex-col gap-4 items-start">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={async (e) => {
            try {
              const file = e.target.files?.[0]
              if (!file) return

              const key = await upload.mutateAsync({ 
                file,
                campaignId,
                day,
                platform
              })

              onMediaUploaded(key)
            } catch {
              toast.error("Upload failed")
            }
          }}
        />

        <Button
          loading={upload.isPending}
          onClick={() => inputRef.current?.click()}
          variant="outline"
          size="sm"
        >
          {media ? "Replace Media" : "Upload Media"}
        </Button>
      </div>
    </>
  )
}
