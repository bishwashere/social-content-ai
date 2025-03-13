/**
 * All the routes for the backend APIs are defined here.
 */
class ApiRoutes {
  AUTH = {
    CONTINUE_WITH_GOOGLE: () => "/auth/continue-with-google",
    SESSION: () => "/auth/session",
  };

  PROJECTS = Object.assign(() => "/projects", {
    BY_ID: (id: string) => `/projects/${id}`,
    CHAT: (id: string) => `/projects/${id}/chat`,
    TRACK: (id: string) => `/projects/${id}/track`,
    SUMMARY: () => "/projects/summary",
    INVITE: (id: string) => `/projects/${id}/invite`,
  });

  PAYMENT = {
    SESSION: () => "/payment/session",
    SUBSCRIPTIONS: () => "/payment/subscriptions",
  };

  WALL = Object.assign(() => "/wall", {});
}

export const apiRoutes = new ApiRoutes();
