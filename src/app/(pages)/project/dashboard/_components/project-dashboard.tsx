"use client";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { useState } from "react";
import { ProjectCard } from "./project-card";
import { useGetAllProjects, useGetProjectsSummary } from "@/backend-apis/projects/hooks";
import { SummarySection } from "./summary-section";

export default function ProjectDashboard() {
  const [showSummary, setShowSummary] = useState(false);
  const projects = useGetAllProjects()
  const summary = useGetProjectsSummary()

  if (projects.isLoading) return null

  return (
    <div className="flex-grow max-w-full mx-auto items-center justify-center p-8 space-y-8">
      <Collapsible open={showSummary} onOpenChange={setShowSummary}>
        <CollapsibleTrigger className="flex w-full items-center bg-gray-200 p-4 rounded-md justify-between text-lg font-semibold">
          <span>📊 Summary</span>
          <span>{showSummary ? "▲" : "▼"}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 p-4 border-l-4 border-gray-200">
          <SummarySection summary={summary} />
        </CollapsibleContent>
      </Collapsible>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {projects?.data?.map((project) => (
          <ProjectCard
            key={project._id}
            project={project}
          />
        ))}
      </div>
    </div>
  );
}
