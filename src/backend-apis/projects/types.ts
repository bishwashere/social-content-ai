import { ProjectValidatorType } from "@/validators/projects";
import { Projects } from "@generated/prisma";
import { ProjectTracking } from "@prisma/client";

export type CreateProjectProps = ProjectValidatorType["createProject"];

export type ProjectWithChats = Projects & {
  projectChats?: {
    id: string;
    title: string;
  }[];
};

export type UpdateProjectProps = ProjectValidatorType["updateProject"] & {
  id: string;
};

export type GenerateProjectContentProps = ProjectValidatorType["createChat"] & {
  projectId: string;
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
