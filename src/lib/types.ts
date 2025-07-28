import { z } from "zod";

/**
 * Utility type to infer types for all properties of an object
 * @param T - Object with properties of type z.ZodTypeAny
 */
export type InferValidators<T> = {
  [K in keyof T]: T[K] extends z.ZodTypeAny ? z.infer<T[K]> : never;
};

/**
 * Include the id property in a type
 * @param T - Type to include id in
 */
export type WithId<T> = T & { id: string };

/**
 * Include the id property in a type as a string, for client use
 * @param T - Type to include id in
 */
export type WithIdAsString<T> = T & { id: string };

/**
 * Type to exclude database specific properties from a type like createdAt, updatedAt, and id
 * @param T - Type to exclude database specific properties from
 */
export type ForClient<T> = Omit<T, "createdAt" | "updatedAt" | "id"> & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
