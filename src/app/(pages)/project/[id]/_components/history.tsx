"use client";
import {
  Card,
  CardDescription,
} from "@/components/ui/card";
import { ProjectWithChats } from "@/backend-apis/projects/types";
import { useRouter } from "next/navigation";

export default function History({ project }: { project: ProjectWithChats }) {
  const router = useRouter();
  return (
    <div className="w-full flex flex-col gap-4">
      {project.projectChats?.map((chat) => (
        <Card className="!p-3 cursor-pointer" key={chat.id} onClick={() => router.push(`/project/${project.id}/chat/${chat.id}`)}>
          <CardDescription>
            {chat.title}
          </CardDescription>
        </Card>
      ))}
    </div>
  )
}
