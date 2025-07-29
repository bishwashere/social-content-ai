"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChevronLeft, CopyIcon, Share2Icon } from "lucide-react";
import Markdown from "react-markdown";
import {
  useGetAllProjectChats,
  useGetAllProjects,
} from "@/backend-apis/projects/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { Projects as Project, ProjectChat } from "@prisma/client";

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

  const projectChats = useGetAllProjectChats({ projectId: id });
  const projects = useGetAllProjects();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

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
    <div className="flex-grow max-w-3xl mx-auto justify-center px-4 space-y-4">
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
            {Object.entries(chat.contents || {}).map(([platform, text]) => (
              <div key={platform} className="border p-4 rounded-lg mb-4">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold capitalize">{platform}</h3>
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(text, platform)}
                    >
                      <CopyIcon />
                    </Button>
                    <AutoPost platform={platform as any} content={text} />
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
                  <Markdown>
                    {(text as string)
                      .split("\n")
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0)
                      .join("\n\n")}
                  </Markdown>
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
