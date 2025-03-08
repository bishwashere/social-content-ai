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
    <div className="p-6  w-5/6">

      <Collapsible open={showSummary} onOpenChange={setShowSummary} >
        <CollapsibleTrigger className="flex w-full items-center bg-gray-200 p-3 rounded-lg justify-between">
          <span>     📊 Summary</span>
          <span>{showSummary ? "▲" : "▼"}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-5">
          <SummarySection summary={summary} />
        </CollapsibleContent>
      </Collapsible>


      <div className="space-y-6 mt-9">
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