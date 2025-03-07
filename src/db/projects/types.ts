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
