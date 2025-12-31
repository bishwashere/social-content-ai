"use client";

import { useRef, useState } from "react";
import { ProjectCard } from "./project-card";
import { useGetAllProjects } from "@/backend-apis/projects/hooks";
import { Graph } from "./graph";
import { QuickStatsCards } from "./quick-stats-cards";

export default function ProjectDashboard() {
  const projects = useGetAllProjects();
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [activeGraph, setActiveGraph] = useState({
    platform: "",
    projectId: ""
  })

  if (projects.isLoading) return null;

  return (
    <div className="flex-grow max-w-full mx-auto items-center justify-center p-8 space-y-8">
      {/* Quick Stats Cards */}
      <QuickStatsCards />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
        {projects.data?.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={(data) => {
              setActiveGraph(data)
              if (graphContainerRef?.current) {
                graphContainerRef.current.style.minHeight = "500px";
                setTimeout(() => {
                  if (graphContainerRef?.current) {
                    graphContainerRef.current?.scrollIntoView({
                      behavior: "smooth"
                    })
                    graphContainerRef.current.style.minHeight = "none"
                  }
                }, 200);
              }

            }}
          />
        ))}
      </div>

      <div ref={graphContainerRef} className="pb-12">
        <Graph
          // platform={activeGraph.platform}
          // projectId={activeGraph.projectId}
        />
      </div>
    </div>
  );
}
