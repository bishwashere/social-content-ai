import { AxiosError } from "axios";

export type ApiResponse<T = null> = {
  data: {
    data: T;
    message: string;
  };
};

export type ApiError = AxiosError<{ message: string }>;

export type MongooseBaseDocument<T> = T & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};
