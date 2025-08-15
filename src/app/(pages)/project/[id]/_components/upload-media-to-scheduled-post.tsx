import { useUploadMediaForScheduledPost } from "@/backend-apis/video-generation/hooks"
import { Button, buttonVariants } from "@/components/ui/button"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export const UploadMediaToScheduledPost = ({
  postId,
  media,
}: {
  postId: string
  media?: string | null
}) => {
  const upload = useUploadMediaForScheduledPost()
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [fileType, setFileType] = useState<null | "img" | "video" | "unknown">(null)

  const updateScheduledPost = useMutation({
    mutationFn: async (updateData: {
      id: string
      media?: string
    }) => {
      const response = await fetch("/api/scheduled-posts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        throw new Error("Failed to update scheduled post")
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success("Updated scheduled post content")
      queryClient.invalidateQueries({
        queryKey: ["scheduledPosts"],
      })
    },
    onError: () => {
      toast.error("Failed to update scheduled post")
    },
  })

  useEffect(() => {
    if (!media) {
      setFileType(null)
      return
    }

    try {
      const url = new URL(media)
      const pathname = url.pathname
      const extension = pathname.split('.').pop()?.toLowerCase()

      if (!extension) {
        setFileType("unknown")
        return
      }

      if (["png", "jpg", "jpeg", "gif", "webp"].includes(extension)) {
        setFileType("img")
      } else if (["mp4", "mov", "webm", "avi"].includes(extension)) {
        setFileType("video")
      } else {
        setFileType("unknown")
      }
    } catch (e) {
      // In case media is not a valid URL
      setFileType("unknown")
    }
  }, [media])

  return (
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

            const key = await upload.mutateAsync({ file })

            updateScheduledPost.mutate({
              id: postId,
              media: key,
            })
          } catch {
            toast.error("Upload failed")
          }
        }}
      />

      <Button
        loading={updateScheduledPost.isPending || upload.isPending}
        onClick={() => inputRef.current?.click()}
        variant="outline"
      >
        {media ? "Replace Media" : "Upload Media"}
      </Button>

      {fileType === "img" && media && (
        <img src={media} alt="Uploaded media" className="max-w-sm rounded" />
      )}

      {fileType === "video" && media && (
        <video src={media} controls className="max-w-sm rounded" />
      )}

      {fileType === "unknown" && media && (
        <a className={buttonVariants({ variant: "outline" })} href={media} target="_blank">
          View Media
        </a>
      )}
    </div>
  )
}
