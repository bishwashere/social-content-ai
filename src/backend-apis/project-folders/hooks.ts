import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRoutes } from "../routes";
import { ProjectFolder, CreateProjectFolderProps, UpdateProjectFolderProps, AddProjectToFolderProps } from "./index";

// Get all project folders
export const useGetProjectFolders = () => {
  return useQuery({
    queryKey: ["project-folders"],
    queryFn: async () => {
      const response = await fetch(apiRoutes.PROJECT_FOLDERS(), {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch project folders");
      }
      const data = await response.json();
      return data.data as ProjectFolder[];
    },
  });
};

// Create a new project folder
export const useCreateProjectFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (folder: CreateProjectFolderProps) => {
      const response = await fetch(apiRoutes.PROJECT_FOLDERS(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(folder),
      });
      if (!response.ok) {
        throw new Error("Failed to create project folder");
      }
      const data = await response.json();
      return data.data as ProjectFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-folders"] });
    },
  });
};

// Update a project folder
export const useUpdateProjectFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (folder: UpdateProjectFolderProps) => {
      const response = await fetch(apiRoutes.PROJECT_FOLDERS(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(folder),
      });
      if (!response.ok) {
        throw new Error("Failed to update project folder");
      }
      const data = await response.json();
      return data.data as ProjectFolder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-folders"] });
    },
  });
};

// Delete a project folder
export const useDeleteProjectFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (folderId: string) => {
      const response = await fetch(apiRoutes.PROJECT_FOLDERS(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id: folderId }),
      });
      if (!response.ok) {
        throw new Error("Failed to delete project folder");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-folders"] });
    },
  });
};

// Add a project to a folder
export const useAddProjectToFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AddProjectToFolderProps) => {
      const response = await fetch(apiRoutes.PROJECT_FOLDER_ITEMS(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to add project to folder");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-folders"] });
    },
  });
};

// Remove a project from a folder
export const useRemoveProjectFromFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AddProjectToFolderProps) => {
      const response = await fetch(apiRoutes.PROJECT_FOLDER_ITEMS(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to remove project from folder");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-folders"] });
    },
  });
};
