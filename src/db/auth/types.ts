import { User } from "./schema/user";

export type SaveUserProps = Omit<User, "_id" | "createdAt" | "updatedAt">;
