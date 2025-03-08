"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChevronLeft, CopyIcon } from "lucide-react";
import Markdown from "react-markdown";
import { useGetAllProjectChats } from "@/backend-apis/projects/hooks";
import { ProjectChat } from "@/backend-apis/projects/types";
import { Skeleton } from "@/components/ui/skeleton";


export default function ChatPage() {
  const { id, chatId } = useParams() as { id: string; chatId: string };
  const [chat, setChat] = useState<ProjectChat | null>(null);

  const projectChats = useGetAllProjectChats({ projectId: id })

  useEffect(() => {
    const chat = projectChats.data?.find((p) => p._id === chatId);
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
      }
    );
  };



  return (
    <div className="flex-grow max-w-3xl mx-auto justify-center px-4 space-y-4">

      {
        projectChats.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) :

          chat ?

            <>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/project/${id}`}
                  className={buttonVariants({ variant: "ghost", size: "icon" })}
                >
                  <ChevronLeft />
                </Link>
                <h1 className="text-2xl font-bold">
                  {chat.title}
                </h1>
              </div>
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Prompt:</h2>
                <p>{chat.prompt}</p>
              </div>
              <div className="space-y-4 pb-10">
                {Object.entries(chat.contents).map(([platform, text]) => (
                  <div key={platform} className="border p-4 rounded-lg mb-4">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-bold capitalize">{platform}</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(text, platform)}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div
                      className="text-sm text-muted-foreground w-full *:break-words *:whitespace-pre-wrap">

                      <Markdown >
                        {text}
                      </Markdown>
                    </div>

                  </div>
                ))}
              </div>
            </> :

            <div className="flex flex-wrap gap-2 items-center ">
              <h1 className="text-2xl font-bold text-destructive">
                Chat Not Found
              </h1>
              <p>
                The chat you&aposre looking for doesn&apost exist or has been deleted.
              </p>
            </div>
      }
    </div>
  );
}
