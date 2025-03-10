import { Document, Types } from "mongoose";
import { z } from "zod";

/**
 * Utility type to infer types for all properties of an object
 * @param T - Object with properties of type z.ZodTypeAny
 */
export type InferValidators<T> = {
  [K in keyof T]: T[K] extends z.ZodTypeAny ? z.infer<T[K]> : never;
};

/**
 * Include the _id property in a type
 * @param T - Type to include _id in
 */
export type WithId<T> = Document & T & { _id: Types.ObjectId };

/**
 * Include the _id property in a type as a string, for client use
 * @param T - Type to include _id in
 */
export type WithIdAsString<T> = T & { _id: string };

/**
 * Type to exclude Mongoose specific properties from a type like createdAt, updatedAt, and _id
 * @param T - Type to exclude Mongoose specific properties from
 */
export type ForClient<T> = Omit<T, "createdAt" | "updatedAt" | "_id"> & {
  _id: string;
  createdAt: string;
  updatedAt: string;
};
