"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import React, { useEffect, useState } from 'react'
import { All } from "./all"
import { Facebook } from "./facebook"
import { Linkedin } from "./linkedin"
import { Threads } from "./threads"
import { useGetAllProjects } from "@/backend-apis/projects/hooks"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const timeRangeOptions = [
  { label: "1 week", value: 7 },
  { label: "1 month", value: 30 },
  { label: "3 months", value: 90 },
  { label: "1 year", value: 365 },
  { label: "5 years", value: 365 * 5 },
];

export type AnalyticsPlatformsProps = {
  timerange: number;
  selectedProject: string | null;
}

const AnalyticsTabs = () => {

  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [timerange, setTimerange] = useState<number>(timeRangeOptions[0].value);
  const projects = useGetAllProjects();

  useEffect(() => {
    if (projects.data)
      setSelectedProject(projects.data?.filter(project => project.userRole === "admin")[0].id || null)
  }, [projects.data])

  return (
    <Tabs defaultValue="all" className="p-3 sm:p-8">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="Facebook">Facebook</TabsTrigger>
        <TabsTrigger value="Linkedin">Linkedin</TabsTrigger>
        <TabsTrigger value="Threads">Threads</TabsTrigger>
      </TabsList>
      <div className="w-full">
        {projects.data && projects.data.length && selectedProject &&
          <div className='flex justify-end gap-4 items-center'>
            <div className='flex gap-2 items-center xl:-mt-10'>
              <p className='text-sm'>Time Range</p>
              <Select value={String(timerange)} onValueChange={(value) => setTimerange(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timerange" />
                </SelectTrigger>
                <SelectContent>
                  {timeRangeOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex gap-2 items-center xl:-mt-10'>
              <p className='text-sm'>Project:</p>
              <Select value={selectedProject} onValueChange={(value) => setSelectedProject(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.data
                    .filter(project => project.userRole === "admin")
                    .map(project => (
                      <SelectItem key={project.id} value={project.id || ""}>
                        {project.name || project.id || ''}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      </div>
      <TabsContent value="all">
        <All timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Facebook">
        <Facebook timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Linkedin">
        <Linkedin timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
      <TabsContent value="Threads">
        <Threads timerange={timerange} selectedProject={selectedProject} />
      </TabsContent>
    </Tabs>
  )
}

export { AnalyticsTabs }