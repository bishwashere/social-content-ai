import { Wall } from "@/db/wall/schema/wall";
import { wallValidatorType } from "@/validators/wall";

export type CreateWallProps = wallValidatorType["post"];

export type GetWallProps = {
  page: number;
};

export type WallResponsePaginated = {
  posts: (Omit<Wall, "userId"> & {
    userId: {
      avatarUrl: string;
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
