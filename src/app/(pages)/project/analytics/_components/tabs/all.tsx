import { useSession } from '@/backend-apis/auth/hooks'
import { useGetAllPlatformMetrics } from '@/backend-apis/metrics/hooks'
import ViewAnalytics, { ViewAnalyticsProps, ViewAnalyticsSkeleton } from './view-analytics'
import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGetAllProjects } from '@/backend-apis/projects/hooks';

export const timeRangeOptions = [
  { label: "1 week", value: 7 },
  { label: "1 month", value: 30 },
  { label: "3 months", value: 90 },
  { label: "1 year", value: 365 },
  { label: "5 years", value: 365 * 5 },
];

const All = () => {
  const { data: session } = useSession();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const { isLoading, data } = useGetAllPlatformMetrics(session?.user.id || "", selectedProject);
  const [timerange, setTimerange] = useState<number>(timeRangeOptions[0].value);
  const [analytics, setAnalytics] = useState<ViewAnalyticsProps>({ totalComments: 0, totalFollowers: 0, totalImpressions: 0, totalLikes: 0, totalPosts: 0, chartData: [] });
  const projects = useGetAllProjects();

  useEffect(() => {
    if (data?.data && timerange) {
      const now = new Date();
      const cutoffDate = new Date(now);
      cutoffDate.setDate(now.getDate() - timerange);

      const filteredData = data.data.filter((item) => {
        const postDate = new Date(item.date);
        return postDate >= cutoffDate;
      });

      setAnalytics({
        totalPosts: filteredData.length,
        totalComments: filteredData.reduce((sum, d) => sum + (d.comments || 0), 0),
        totalLikes: filteredData.reduce((sum, d) => sum + (d.likes || 0), 0),
        totalFollowers: 0,
        totalImpressions: filteredData.reduce((sum, d) => sum + (d.impressions || 0), 0),
        chartData: filteredData.map((d) => ({
          label: d.content?.substring(0, 20) + "...",
          totalComments: d.comments || 0,
          totalImpressions: d.impressions || 0,
          totalLikes: d.likes || 0,
        })),
      });
    }
  }, [data, timerange]);

  useEffect(()=> {
    if(projects.data)
      setSelectedProject(projects.data?.filter(project => project.userRole==="admin")[0].id || null)
  },[projects.data])

  if (isLoading || projects.isLoading) return <ViewAnalyticsSkeleton />

  return (
    <div className='w-full'>
      {projects.data && projects.data.length && selectedProject &&
        <div className='flex justify-end gap-4 items-center mb-2'>
          <div className='flex gap-2 items-center'>
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
          <div className='flex gap-2 items-center'>
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
      <ViewAnalytics {...analytics} />
    </div>
  )
}

export { All }

