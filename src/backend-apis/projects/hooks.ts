import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateProjectProps,
  GenerateProjectContentProps,
  GetAllProjectChatsProps,
  UpdateProjectProps,
} from "./types";
import { projectService } from ".";
import { toast } from "sonner";

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
