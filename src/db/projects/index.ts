import { Err, Ok } from "ts-res";
import { Project, ProjectDocument, ProjectModel } from "./schema/project";
import {
  CreateChatProps,
  CreateProjectProps,
  GetAllProjectsProps,
  GetProjectProps,
  UpdateProjectProps,
} from "./types";
import mongoose from "mongoose";
import {
  ProjectChat,
  ProjectChatDocument,
  ProjectChatModel,
} from "./schema/chat";
import { GetAllProjectChatsProps } from "@/backend-apis/projects/types";

class Projects {
  /**
   *  Create a new project with the given data.
   */
  async create(data: CreateProjectProps) {
    try {
      const project = await ProjectModel.create({
        name: data.name,
        description: data.description,
        userId: new mongoose.Types.ObjectId(data.userId),
      });

      return Ok(project as Project);
    } catch (e) {
      console.error("Failed to create project!", e);

      return Err("Failed to create project!");
    }
  }

  /**
   * Update the project with the given _id and userId with the given data.
   */
  async update({ _id, userId, ...data }: UpdateProjectProps) {
    try {
      const project = await ProjectModel.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(_id),
          userId: new mongoose.Types.ObjectId(userId),
        },
        {
          $set: {
            updatedAt: new Date(),
            ...data,
          },
        },
        {
          returnDocument: "after",
        }
      );

      if (!project) {
        return Err("Project not found!");
      }

      return Ok(project as Project);
    } catch (e) {
      console.error("Failed to update project!", e);

      return Err("Failed to update project!");
    }
  }

  /**
   *  Get all projects that belong to the user with the given userId.
   */
  async getAll({ userId }: GetAllProjectsProps) {
    try {
      console.log("Getting all projects for user with id: ", userId);
      /**
       * Get all projects that belong to the user with the title and _id of the chats for each project.
       */

      const projects = await ProjectModel.find<ProjectDocument>({
        userId: new mongoose.Types.ObjectId(userId),
      });

      const projectsWithChats = await Promise.all(
        projects.map(async (project) => {
          const chats = await ProjectChatModel.find({
            projectId: project._id,
          }).sort({ createdAt: -1 });

          return {
            ...project.toJSON(),
            chats: chats.map((chat) => chat.toJSON()),
          };
        })
      );

      return Ok(projectsWithChats);
    } catch (e) {
      console.error("Failed to get projects!", e);

      return Err("Failed to get projects!");
    }
  }

  /**
   *  Create a new chat with the given data. If retry has a chatId, update the chat with the given chatId.
   */
  async createChat({ retry, ...data }: CreateChatProps) {
    try {
      if (retry && retry.chatId) {
        const chat = await ProjectChatModel.findOneAndUpdate(
          {
            _id: new mongoose.Types.ObjectId(retry.chatId as string),
            projectId: new mongoose.Types.ObjectId(data.projectId),
          },
          {
            $set: {
              updatedAt: new Date(),
              ...data,
              projectId: new mongoose.Types.ObjectId(data.projectId),
            },
          },
          {
            returnDocument: "after",
          }
        );

        if (!chat) {
          return Err("Chat not found!");
        }

        return Ok(chat);
      } else {
        const projectChat = await ProjectChatModel.create<ProjectChatDocument>({
          ...data,
          projectId: new mongoose.Types.ObjectId(data.projectId),
        });

        return Ok(projectChat as ProjectChat);
      }
    } catch (e) {
      console.error("Failed to create chat!", e);

      return Err("Failed to create chat!");
    }
  }

  /**
   *  Get all chats that belong to the project with the given projectId.
   */
  async getChats({ projectId }: GetAllProjectChatsProps) {
    try {
      const chats = await ProjectChatModel.find<ProjectChatDocument>({
        projectId: new mongoose.Types.ObjectId(projectId),
      }).sort({ createdAt: -1 });

      return Ok(chats);
    } catch (e) {
      console.error("Failed to get chats!", e);

      return Err("Failed to get chats!");
    }
  }

  /**
   *  Get the project with the given projectId and userId.
   */
  async getProject({ projectId, userId }: GetProjectProps) {
    try {
      const project = await ProjectModel.findOne<Project>({
        _id: new mongoose.Types.ObjectId(projectId),
        userId: new mongoose.Types.ObjectId(userId),
      });

      if (!project) {
        return Err("Project not found!");
      }

      return Ok(project as Project);
    } catch (e) {
      console.error("Failed to get project!", e);

      return Err("Failed to get project!");
    }
  }
}

export const projects = new Projects();
