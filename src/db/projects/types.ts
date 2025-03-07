import { ProjectChat } from "./schema/chat";
import { Project } from "./schema/project";

export type CreateProjectProps = Omit<
  Project,
  "_id" | "createdAt" | "updatedAt"
>;

export type UpdateProjectProps = Partial<CreateProjectProps> & {
  _id: string;
};

export type GetAllProjectsProps = {
  userId: string;
};

export type GetProjectProps = {
  projectId: string;
  userId: string;
};

export type CreateChatProps = Omit<
  ProjectChat,
  "_id" | "createdAt" | "updatedAt" | "projectId"
> & {
  retry?: {
    chatId: string;
  };
  projectId: string;
};

export type GetAllChatProps = {
  projectId: string;
};
