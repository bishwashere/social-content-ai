import { auth } from "./auth";

class DB {
  auth = auth;
}

export const db = new DB();
