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

export type GetProjectTrackingProps = {
  projectId: string;
};

export type ProjectTrackingResponse = {
  projectId: string;
  date: string;
  url?: string;
  platform: "x" | "tiktok" | "instagram" | "facebook";
}[];

export type TrackProjectProps = {
  projectId: string;
  platform: string;
  url?: string;
  date: string;
};

export type ProjectSummary = {
  totalProjects: number;
  activePlatforms: number;
  inactivePlatforms: number;
  totalPlatforms: number;
  mostActiveProject: { name: string; count: number } | null;
  totalPostsForEachProject: { name: string; count: number }[];
};
