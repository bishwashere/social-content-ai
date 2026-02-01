import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateProjectProps,
  GenerateProjectContentProps,
  GetAllProjectChatsProps,
  GetProjectTrackingProps,
  TrackProjectProps,
  UpdateProjectProps,
} from "./types";
import { projectService } from ".";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getAllDayProjectPulse, getProjectPulse, getWebsiteDescription } from "./actions";
import tryCatchAsync from "@/lib/try-catch-async";
import api from "../axios";
import { apiRoutes } from "../routes";
import { ApiError, ApiResponse } from "../types";
import { useSession } from "../auth/hooks";

export type ProjectActivityScore = { projectId: string; score: number };

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (project: CreateProjectProps) => {
      return projectService.createProject(project, queryClient);
    },
    onSuccess: (message) => {
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useGetProjectById = (projectId: string) => {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectService.getProjectById(projectId),
    enabled: !!projectId,
  });
};

export const useGetAllProjects = () => {
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession();

  return useQuery({
    queryFn: projectService.getProjects,
    queryKey: ["projects"],
    enabled: !sessionLoading && !sessionError && !!session, // Only fetch when authenticated
    retry: 0, // Don't retry on auth errors
  });
};

export const useGetProjectActivityScores = () => {
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession();

  return useQuery<ProjectActivityScore[]>({
    queryKey: ["projects", "activity-scores"],
    queryFn: async (): Promise<ProjectActivityScore[]> => {
      const res = await api.get(apiRoutes.PROJECTS.ACTIVITY_SCORES());
      const body = res.data as { data?: ProjectActivityScore[] };
      return body.data ?? [];
    },
    enabled: !sessionLoading && !sessionError && !!session,
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProjectProps) => {
      return projectService.updateProject(data, queryClient);
    },
    onSuccess: (message) => {
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useGenerateProjectContent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateProjectContentProps) => {
      return projectService.generateProjectContent(data, queryClient);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects"],
      });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useGetAllProjectChats = (data: GetAllProjectChatsProps) => {
  return useQuery({
    queryFn: () => projectService.getAllProjectChats(data),
    queryKey: ["project-chats", data],
  });
};

export const useGetTrackedProjects = (data: GetProjectTrackingProps) => {
  return useQuery({
    queryFn: () => projectService.getTrackedProjects(data),
    queryKey: ["project-tracking", data],
    enabled: !!data.projectId,
  });
};

export const useTrackProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TrackProjectProps) => {
      return projectService.trackProject(data, queryClient);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useGetProjectsSummary = () => {
  return useQuery({
    queryFn: () => projectService.getSummary(),
    queryKey: ["project-summary"],
  });
};

export const useInviteUserToProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectService.inviteUser,
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (message) => {
      toast.success(message);
      queryClient.invalidateQueries({
        queryKey: ["projects"]
      });
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (projectId: string) => {
      return projectService.deleteProject(projectId, queryClient);
    },
    onSuccess: (message) => {
      toast.success(message);
      router.push("/project");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};

export const useGetWebsiteDescription = () => {
  return useMutation({
    mutationFn: getWebsiteDescription,
  });
};

export const useGetProjectPulse = (projectId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["project-pulse", projectId],
    queryFn: () => getProjectPulse(projectId),
    enabled: !!projectId && enabled, // Only enable when projectId exists AND enabled flag is true
  });
};

export const useGetAllDayProjectPulse = (projectId: string) => {
  return useQuery({
    queryKey: ["all-project-pulse", projectId],
    queryFn: () => getAllDayProjectPulse(projectId),
    enabled: !!projectId,
  });
};

export const useGetAllScheduledPosts = () => {
  return useQuery({
    queryKey: ["allScheduledPosts"],
    queryFn: async () => {
      const [err, res] = await tryCatchAsync<ApiError, { data: any[] }>(
        async () => {
          const response = await api.get("/scheduled-posts/all");
          return response;
        }
      );
      if (err) {
        if (err.response?.status === 401) {
          throw new Error("Please log in to view scheduled posts");
        }
        throw new Error(err.response?.data?.message || "Failed to fetch scheduled posts");
      }
      
      // Debug: Log the raw response
      console.log('🔍 useGetAllScheduledPosts - Raw API response:', {
        fullResponse: res,
        responseData: res.data,
        dataType: typeof res.data,
        isArray: Array.isArray(res.data),
        length: Array.isArray(res.data) ? res.data.length : 'not an array',
        firstItem: Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null,
      });
      
      // The API returns the array directly, not wrapped in data.data
      const result = res.data || [];
      console.log('📦 useGetAllScheduledPosts - Returning:', {
        resultLength: result.length,
        isArray: Array.isArray(result),
      });
      return result;
    },
    retry: 1, // Only retry once
    retryDelay: 1000,
  });
};