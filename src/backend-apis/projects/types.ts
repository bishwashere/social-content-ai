import { MongooseBaseDocument } from "../types";

export type CreateProjectProps = {
  name: string;
  description: string;
};

export type Project = MongooseBaseDocument<{
  name: string;
  description: string;
  userId: string;
  chats?: {
    _id: string;
    title: string;
  }[];
}>;

export type UpdateProjectProps = Partial<CreateProjectProps> & {
  _id: string;
};

export type GenerateProjectContentProps = {
  projectId: string;
  userPrompt: string;
  retry?: {
    chatId: string;
  };
};

export type ProjectChat = MongooseBaseDocument<{
  projectId: string;
  prompt: string;
  title: string;
  contents: {
    facebook: string;
    instagram: string;
    x: string;
    tiktok: string;
  };
}>;

export type GetAllProjectChatsProps = {
  projectId: string;
};
