import connectToDb from "@/db/connect";
import { CALL_NEXT_FUNCTION } from "./apply-middleware";

/**
 * Middleware to connect to the database
 */
export const connectToDBMiddleware = () => async () => {
  await connectToDb();
  return CALL_NEXT_FUNCTION;
};
