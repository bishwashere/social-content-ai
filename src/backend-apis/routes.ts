const API_ROUTES = {
  auth: {
    CONTINUE_WITH_GOOGLE: "/auth/continue-with-google",
    SESSION: "/auth/session",
  },
  projects: {
    INDEX: "/projects",
    BY_ID: (id: string) => `/projects/${id}`,
    CHAT: (id: string) => `/projects/${id}/chat`,
    TRACK: (id: string) => `/projects/${id}/track`,
    SUMMARY: "/projects/summary",
    INVITE: (id: string) => `/projects/${id}/invite`,
  },
};

export default API_ROUTES;
