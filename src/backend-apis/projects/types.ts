import { ProjectValidatorType } from "@/validators/projects";
import { Project } from "@/db/projects/schema/project";
import { ProjectTracking } from "@/db/projects/schema/tracking";

export type CreateProjectProps = ProjectValidatorType["createProject"];

export type ProjectWithChats = Project & {
  chats?: {
    _id: string;
    title: string;
  }[];
};

export type UpdateProjectProps = ProjectValidatorType["updateProject"] & {
  _id: string;
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
  totalPostsForEachProject: { name: string; count: number }[];
};

export type InviteUserProps = ProjectValidatorType["inviteUser"] & {
  projectId: string;
};
