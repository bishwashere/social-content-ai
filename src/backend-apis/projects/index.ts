import tryCatchAsync from "@/lib/try-catch-async";
import {
  CreateProjectProps,
  GenerateProjectContentProps,
  GetAllProjectChatsProps,
  GetProjectTrackingProps,
  InviteUserProps,
  ProjectSummary,
  ProjectTrackingResponse,
  ProjectWithChats,
  TrackProjectProps,
  UpdateProjectProps,
} from "./types";
import api from "../axios";
import { ApiError, ApiResponse } from "../types";
import { QueryClient } from "@tanstack/react-query";
import { Project } from "@/db/projects/schema/project";
import { ProjectChat } from "@/db/projects/schema/chat";
import { apiRoutes } from "../routes";

class ProjectService {
  /**
   * Create a new project
   */
  async createProject(project: CreateProjectProps, queryClient: QueryClient) {
    const [err, res] = await tryCatchAsync<ApiError, ApiResponse<Project>>(
      async () => {
        const response = await api.post(apiRoutes.PROJECTS(), project);
        return response;
      }
    );
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    await queryClient.setQueryData<Project[]>(["projects"], (data) => {
      return data ? [res.data.data, ...data] : [res.data.data];
    });

    return res.data.message;
  }

  /**
   * Get all the projects related to the user, with title of chats
   */
  async getProjects() {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectWithChats[]>
    >(async () => {
      const response = await api.get(apiRoutes.PROJECTS());
      return response;
    });
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  /**
   * Edit a project
   */
  async updateProject(
    { _id, ...rest }: UpdateProjectProps,
    queryClient: QueryClient
  ) {
    const [err, res] = await tryCatchAsync<ApiError, ApiResponse<Project>>(
      async () => {
        const response = await api.patch(apiRoutes.PROJECTS.BY_ID(_id), rest);
        return response;
      }
    );
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    await queryClient.setQueryData<Project[]>(["projects"], (data) => {
      return data
        ? // update the project with the new data
          data?.map((project) => {
            if (project._id === _id) {
              return { ...project, ...res.data.data };
            }
            return project;
          })
        : [res.data.data];
    });

    return res.data.message;
  }

  /**
   * Generates the content for a project, if retry is provided, it will update the chat with the new generated content
   */
  async generateProjectContent(
    { projectId, userPrompt, retry }: GenerateProjectContentProps,
    queryClient: QueryClient
  ) {
    const [err, res] = await tryCatchAsync<ApiError, ApiResponse<ProjectChat>>(
      async () => {
        const response = await api.post(apiRoutes.PROJECTS.CHAT(projectId), {
          userPrompt,
          retry,
        });
        return response;
      }
    );
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    if (retry && retry.chatId) {
      await queryClient.setQueryData<ProjectWithChats[]>(
        ["projects"],
        (data) => {
          return data
            ? // update the project with the new data
              data?.map((project) => {
                if (project._id === projectId) {
                  return {
                    ...project,
                    chats: project.chats?.map((chat) =>
                      chat._id === retry.chatId
                        ? { _id: res.data.data._id, title: res.data.data.title }
                        : chat
                    ),
                  };
                }
                return project;
              })
            : data;
        }
      );

      await queryClient.setQueryData<ProjectChat[]>(
        ["project-chats", { projectId }],
        (data) => {
          return data
            ? data.map((chat) =>
                chat._id === retry.chatId ? res.data.data : chat
              )
            : [res.data.data];
        }
      );
    } else {
      // update the project with the new chat
      await queryClient.setQueryData<ProjectWithChats[]>(
        ["projects"],
        (data) => {
          return data
            ? // update the project with the new data
              data?.map((project) => {
                if (project._id === projectId) {
                  return {
                    ...project,
                    chats: project.chats
                      ? [res.data.data, ...project.chats]
                      : [res.data.data],
                  };
                }
                return project;
              })
            : data;
        }
      );

      await queryClient.setQueryData<ProjectChat[]>(
        ["project-chats", { projectId }],
        (data) => {
          return data ? [res.data.data, ...data] : [res.data.data];
        }
      );
    }

    return res.data.data;
  }

  /**
   * Returns all the chats for a project
   */
  async getAllProjectChats({ projectId }: GetAllProjectChatsProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectChat[]>
    >(async () => {
      const response = await api.get(apiRoutes.PROJECTS.CHAT(projectId));
      return response;
    });
    if (err) {
      throw new Error(err.response?.data?.message);
    }
    return res.data.data;
  }

  async getTrackedProjects({ projectId }: GetProjectTrackingProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectTrackingResponse>
    >(async () => {
      const response = await api.get(apiRoutes.PROJECTS.TRACK(projectId));
      return response;
    });
    if (err) {
      return [];
    }
    return res.data.data;
  }

  async trackProject(
    { projectId, ...data }: TrackProjectProps,
    queryClient: QueryClient
  ) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectTrackingResponse>
    >(async () => {
      const response = await api.post(
        apiRoutes.PROJECTS.TRACK(projectId),
        data
      );
      return response;
    });
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    await queryClient.setQueryData(
      ["project-tracking", { projectId }],
      (prev: ProjectTrackingResponse) =>
        prev && prev.length ? [res.data.data, ...prev] : [res.data.data]
    );

    await queryClient.invalidateQueries({
      queryKey: ["project-summary"],
    });

    return res.data.data;
  }

  async getSummary() {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<ProjectSummary>
    >(async () => {
      const response = await api.get(apiRoutes.PROJECTS.SUMMARY());
      return response;
    });
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }

  async inviteUser({ projectId, ...rest }: InviteUserProps) {
    const [err, res] = await tryCatchAsync<ApiError, ApiResponse<Project>>(
      async () => {
        const response = await api.post(
          apiRoutes.PROJECTS.INVITE(projectId),
          rest
        );
        return response;
      }
    );
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.message;
  }
}

export const projectService = new ProjectService();
