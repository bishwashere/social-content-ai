// /dashboard/ProjectCard.tsx
"use client";

import { Edit3 } from "lucide-react";
import { PlatformCard } from "./platform-card";
import { Project } from "@/backend-apis/projects/types";
import { useState } from "react";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({
  project,
}: ProjectCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="p-4 border rounded-lg shadow-md relative">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <button onClick={() =>
          setIsEditing((prev) => !prev)
        } className="text-gray-500 hover:text-gray-700">
          <Edit3 className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          "x",
          "tiktok",
          "instagram",
          "facebook",
        ].map((platform) => (
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