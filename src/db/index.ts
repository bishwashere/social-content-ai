import { auth } from "./auth";
import { projects } from "./projects";

class DB {
  auth = auth;
  projects = projects;
}

export const db = new DB();
