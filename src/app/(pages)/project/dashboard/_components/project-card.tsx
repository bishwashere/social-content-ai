"use client";

import { Edit3, Users2Icon } from "lucide-react";
import { PlatformCard } from "./platform-card";
import { useState } from "react";
import { useSession } from "@/backend-apis/auth/hooks";
import { ProjectWithChats } from "@/backend-apis/projects/types";
import { PLATFORMS } from "@/lib/prompt";

interface ProjectCardProps {
  project: ProjectWithChats;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data } = useSession();
  return (
    <div className="p-4 border rounded-lg shadow-md relative">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <div className="flex space-x-2">
          {data?.user?._id !== project.userId && (
            <Users2Icon className="h-4 w-4 shrink-0 opacity-50" />
          )}
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Edit3 className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {Object.values(PLATFORMS).map((platform) => (
          <PlatformCard
            key={platform}
            isEditing={isEditing}
            platform={platform}
            projectId={project._id}
          />
        ))}
      </div>
    </div>
  );
}
