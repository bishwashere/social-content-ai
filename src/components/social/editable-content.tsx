import { useState } from "react"
import { Button } from "../ui/button";
import Markdown from "react-markdown";
import { Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { UploadMediaToScheduledPost } from "@/app/(pages)/project/[id]/_components/upload-media-to-scheduled-post";

type Props = {
  id: string;
  content: string;
  viewContentEdit: string[];
  setViewContentEdit: React.Dispatch<React.SetStateAction<string[]>>
  media?: string | null
}

const EditableContent = ({ id, content, viewContentEdit, setViewContentEdit, media }: Props) => {
  const [editedContent, setEditedContent] = useState(content);
  const queryClient = useQueryClient();

  const { id: projectId } = useParams();

  const updateScheduledPost = useMutation({
    mutationFn: async (updateData: {
      id: string;
      date?: string;
      content?: string;
      platform?: string;
    }) => {
      const response = await fetch("/api/scheduled-posts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error("Failed to update scheduled post");
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success("Updated scheduled post content");
      queryClient.invalidateQueries({
        queryKey: ["scheduledPosts", projectId]
      })
    },
    onError: () => {
      toast.error("Failed to update scheduled post")
    }
  });

  const toggleEdit = (id: string) => {
    setViewContentEdit((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="text-sm text-muted-foreground w-full" style={{ whiteSpace: "pre-wrap" }}>
      {viewContentEdit.includes(id) ? (
        <div className="flex flex-col gap-2">
          <textarea
            className="w-full border p-2 rounded text-black "
            rows={10}
            value={editedContent ?? content}
            onChange={(e) => setEditedContent(e.target.value)}
          />
          <UploadMediaToScheduledPost media={media} postId={id} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => toggleEdit(id)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => await updateScheduledPost.mutateAsync({ id: id, content: editedContent }).then(() => toggleEdit(id))}
              loading={updateScheduledPost.isPending}
            >
              Save
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Markdown>
            {media && content.length > 150 ?
              content
                .slice(0, 150)
                .split("\n")
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join("\n\n")
              + "...more"
              :
              content
                .split("\n")
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join("\n\n")
            }
          </Markdown>
          {media && <img src={media} alt="Media" className="w-full h-auto" />}
        </>
      )}
    </div>
  )
}

export default EditableContent;