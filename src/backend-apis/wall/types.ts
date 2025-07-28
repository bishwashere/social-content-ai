import { Wall } from "@generated/prisma";
import { wallValidatorType } from "@/validators/wall";

export type CreateWallProps = wallValidatorType["post"];

export type GetWallProps = {
  page: number;
};

export type WallResponsePaginated = {
  posts: (Omit<Wall, "userId" | "projectId"> & {
    user: {
      avatarUrl: string;
      name: string;
    };
    project: {
      name: string;
    };
  })[];
  pagination: {
    page: number;
    limit: number;
    totalPosts: number;
    totalPages: number;
    hasMore: boolean;
  };
};
