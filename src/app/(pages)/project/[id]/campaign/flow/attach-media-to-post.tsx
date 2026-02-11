import { useUploadMediaForScheduledPost } from "@/backend-apis/video-generation/hooks"
import { ViewMedia } from "@/components/social/view-media"
import { Button } from "@/components/ui/button"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"
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


  return (
    <>
      {media && <ViewMedia post={{ media }} showMedia />}
      <div className="flex flex-col gap-4 items-center">
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
      </div>
    </>
  )
}
