import { CreateWallProps, GetWallProps, WallResponsePaginated } from "./types";
import tryCatchAsync from "@/lib/try-catch-async";
import { ApiError, ApiResponse } from "../types";
import { Wall } from "@prisma/client";
import api from "../axios";
import { apiRoutes } from "../routes";

class WallService {
  /**
   * Create a new project
   */
  async createWall(project: CreateWallProps) {
    const [err, res] = await tryCatchAsync<ApiError, ApiResponse<Wall>>(
      async () => {
        const response = await api.post(apiRoutes.WALL(), project);
        return response;
      },
    );
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.message;
  }

  async getWall({ page }: GetWallProps) {
    const [err, res] = await tryCatchAsync<
      ApiError,
      ApiResponse<WallResponsePaginated>
    >(async () => {
      const response = await api.get(apiRoutes.WALL(), {
        params: {
          page,
        },
      });
      return response;
    });
    if (err) {
      throw new Error(err.response?.data?.message);
    }

    return res.data.data;
  }
}

export const wallService = new WallService();
