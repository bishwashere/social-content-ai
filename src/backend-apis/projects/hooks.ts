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
  return useQuery({
    queryFn: projectService.getProjects,
    queryKey: ["projects"],
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
  return useMutation({
    mutationFn: projectService.inviteUser,
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (message) => {
      toast.success(message);
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
