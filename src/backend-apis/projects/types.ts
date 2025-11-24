import { ProjectValidatorType } from "@/validators/projects";
import { Projects } from "@prisma/client";
import { ProjectTracking } from "@prisma/client";

export type CreateProjectProps = ProjectValidatorType["createProject"];

export type ProjectWithChats = Projects & {
  projectChats?: {
    id: string;
    title: string;
  }[];
  projectTrackings?: ProjectTrackingResponse;
  campaignPlanners?: {
    id: string;
    name?: string;
    startDate?: string;
    createdAt: string;
    chats: {
      id: string;
      day: number;
      completed: boolean;
      status: string;
    }[];
  }[];
  invitedUsers?: {
    id: string;
    role: string;
    user: { name: string, email: string };
  }[];
  userRole?: string; // Role of the current user for this project
};

export type UpdateProjectProps = ProjectValidatorType["updateProject"] & {
  id: string;
};

export type GenerateProjectContentProps = ProjectValidatorType["createChat"] & {
  projectId: string;
  platforms?: string[];
  extraInformation?: {
    reddit?: {
      popularPost?: string;
    };
    template?: string;
  };
};

export type GetAllProjectChatsProps = {
  projectId: string;
};

export type GetProjectTrackingProps = {
  projectId: string;
};

export type ProjectTrackingResponse = ProjectTracking[];

export type TrackProjectProps = ProjectValidatorType["trackProject"] & {
  projectId: string;
};

export type ProjectSummary = {
  totalProjects: number;
  activePlatforms: number;
  inactivePlatforms: number;
  totalPlatforms: number;
  mostActiveProject: { name: string; count: number } | null;
  totalPostsForEachProject: {
    name: string;
    count: number;
    trackings: ProjectTrackingResponse;
  }[];
};

export type InviteUserProps = ProjectValidatorType["inviteUser"] & {
  projectId: string;
};
