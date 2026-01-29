"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChevronLeft, CopyIcon, Share2Icon, Pencil } from "lucide-react";
import Markdown from "react-markdown";
import {
  useGetAllProjectChats,
  useGetAllProjects,
} from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Projects as Project, ProjectChat } from "@prisma/client";
import { editChatContent } from "@/server-actions/edit-chat-content";
import { useQueryClient } from "@tanstack/react-query";
import { ViewMedia } from "@/components/social/view-media";
import { PLATFORM_IDS } from "@/constants/platforms";

const ICONS = {
  x: "/x.svg",
  facebook: "/fb.svg",
  linkedin: "/linkedin.png",
  instagram: "/instagram.svg",
  threads: "/threads.svg",
  reddit: "/reddit.svg"
}

import PostToWall from "@/components/common/post-to-wall";
import AutoPost from "@/components/common/auto-post";

export default function ChatPage() {
  const { id, chatId } = useParams() as { id: string; chatId: string };
  const [chat, setChat] = useState<ProjectChat | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const projectChats = useGetAllProjectChats({ projectId: id });
  const projects = useGetAllProjects();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchProject = () => {
      const currentProject = projects?.data?.find((p: Project) => p.id === id);
      setCurrentProject(currentProject || null);
    };

    fetchProject();
  }, [id, projects.data]);

  useEffect(() => {
    const chat = projectChats.data?.find((p) => p.id === chatId);
    setChat(chat || null);
  }, [id, chatId, projectChats.data]);

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success(`${platform} content copied to clipboard!`);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy content");
      },
    );
  };

  return (
    <div className="flex-grow max-w-7xl 2xl:max-w-[90%] mx-auto justify-center px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 space-y-4">
      {projectChats.isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : chat ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/project/${id}`}
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <ChevronLeft />
            </Link>
            <h1 className="text-2xl font-bold">{chat.title}</h1>
          </div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Prompt:</h2>
            <p>{chat.prompt}</p>
          </div>
          <div className="space-y-4 pb-10">
            {/* Instagram Image Card - Instagram content is rendered as image, not text */}
            {(chat.media as Record<string, string>)?.[PLATFORM_IDS.INSTAGRAM] && (
              <div className="border p-4 rounded-lg mb-4">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold capitalize">Instagram</h3>
                </div>
                <div className="aspect-square max-w-[400px] mx-auto">
                  <ViewMedia 
                    post={{ media: (chat.media as Record<string, string>)[PLATFORM_IDS.INSTAGRAM] }} 
                    showMedia 
                  />
                </div>
              </div>
            )}
            {Object.entries(chat.contents || {}).filter(([platform]) => platform !== PLATFORM_IDS.INSTAGRAM).map(([platform, text]) => (
              <div key={platform} className="border p-4 rounded-lg mb-4">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold capitalize">{platform}</h3>
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditedContent({ ...editedContent, [platform]: text });
                        setEditingPlatform(platform);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(text, platform)}
                    >
                      <CopyIcon />
                    </Button>
                    <AutoPost platform={platform as any} content={text} projectId={id} />
                    <PostToWall
                      content={text}
                      platform={platform}
                      projectId={id}
                      prompt={chat.prompt}
                    />
                  </div>
                </div>
                <div
                  className="text-sm text-muted-foreground w-full"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {editingPlatform === platform ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        className="w-full border p-2 rounded text-black"
                        rows={10}
                        value={editedContent[platform] ?? text}
                        onChange={(e) => setEditedContent({ ...editedContent, [platform]: e.target.value })}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" size="sm" onClick={() => setEditingPlatform(null)}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          loading={isSaving}
                          onClick={async () => {
                            try {
                              setIsSaving(true);
                              const updated = await editChatContent({
                                chatId: chatId,
                                platform,
                                content: editedContent[platform] ?? text
                              });
                              console.log("updated", updated);
                              if (updated) {

                                const updatedChat = { ...chat, contents: updated.contents };
                                setChat(updatedChat);
                                setEditingPlatform(null);
                                await queryClient.invalidateQueries({ queryKey: ['projectChats'] });
                                await queryClient.invalidateQueries({ queryKey: ['projects'] });
                                toast.success('Content updated successfully');
                              } else {
                                toast.error('Failed to update content');
                              }
                            } catch (error) {
                              toast.error('Failed to update content');
                            } finally {
                              setIsSaving(false);
                            }
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Markdown>
                      {(text as string)
                        .split("\n")
                        .map((line) => line.trim())
                        .filter((line) => line.length > 0)
                        .join("\n\n")}
                    </Markdown>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2 items-center">
          <h1 className="text-2xl font-bold text-destructive">
            Chat Not Found
          </h1>
          <p>
            The chat you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
        </div>
      )}
    </div>
  );
}
