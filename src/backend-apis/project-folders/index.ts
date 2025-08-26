import api from "../axios";
import { apiRoutes } from "../routes";
import tryCatchAsync from "@/lib/try-catch-async";
import { ApiError, ApiResponse } from "../types";

export interface ProjectFolder {
  id: string;
  name: string;
  description?: string;
  color?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  projectFolderItems: ProjectFolderItem[];
}

export interface ProjectFolderItem {
  id: string;
  folderId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    projectChats: Array<{
      id: string;
      title: string;
    }>;
  };
}

export interface CreateProjectFolderProps {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateProjectFolderProps {
  id: string;
  name: string;
  description?: string;
  color?: string;
}

export interface AddProjectToFolderProps {
  folderId: string;
  projectId: string;
}

class ProjectFolderService {
  /**
   * Get all project folders for the current user
   */
  async getProjectFolders() {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectFolder[]>
    >(async () => {
      const response = await api.get(apiRoutes.PROJECT_FOLDERS());
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Create a new project folder
   */
  async createProjectFolder(folder: CreateProjectFolderProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectFolder>
    >(async () => {
      const response = await api.post(apiRoutes.PROJECT_FOLDERS(), folder);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Update a project folder
   */
  async updateProjectFolder(folder: UpdateProjectFolderProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectFolder>
    >(async () => {
      const response = await api.put(apiRoutes.PROJECT_FOLDERS(), folder);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Delete a project folder
   */
  async deleteProjectFolder(folderId: string) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<void>
    >(async () => {
      const response = await api.delete(`${apiRoutes.PROJECT_FOLDERS()}?id=${folderId}`);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.message;
  }

  /**
   * Add a project to a folder
   */
  async addProjectToFolder(props: AddProjectToFolderProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectFolderItem>
    >(async () => {
      const response = await api.post(apiRoutes.PROJECT_FOLDER_ITEMS(), props);
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Remove a project from a folder
   */
  async removeProjectFromFolder(folderId: string, projectId: string) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<void>
    >(async () => {
      const response = await api.delete(
        `${apiRoutes.PROJECT_FOLDER_ITEMS()}?folderId=${folderId}&projectId=${projectId}`
      );
      return response;
    });

    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.message;
  }
}

export const projectFolderService = new ProjectFolderService();
