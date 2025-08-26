/**
 * All the routes for the backend APIs are defined here.
 */
class ApiRoutes {
  AUTH = {
    CONTINUE_WITH_GOOGLE: () => "/auth/continue-with-google",
    SESSION: () => "/auth/session",
  };

  CREATE_CHAT = () => "/chat";

  PROJECTS = Object.assign(() => "/projects", {
    BY_ID: (id: string) => `/projects/${id}`,
    CHAT: (id: string) => `/projects/${id}/chat`,
    TRACK: (id: string) => `/projects/${id}/track`,
    SUMMARY: () => "/projects/summary",
    INVITE: (id: string) => `/projects/${id}/invite`,
  });

  PROJECT_FOLDERS = () => "/project-folders";

  PROJECT_FOLDER_ITEMS = () => "/project-folders/items";

  PAYMENT = {
    SESSION: () => "/payment/session",
    SUBSCRIPTIONS: () => "/payment/subscriptions",
  };

  WALL = Object.assign(() => "/wall", {});
}

export const apiRoutes = new ApiRoutes();
