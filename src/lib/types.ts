import { Types } from "mongoose";
import { z } from "zod";

/**
 * Utility type to infer types for all properties of an object
 * @param T - Object with properties of type z.ZodTypeAny
 */
export type InferValidators<T> = {
  [K in keyof T]: T[K] extends z.ZodTypeAny ? z.infer<T[K]> : never;
};

export type WithId<T> = T & { _id: Types.ObjectId };
