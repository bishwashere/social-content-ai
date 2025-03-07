const API_ROUTES = {
  auth: {
    CONTINUE_WITH_GOOGLE: "/auth/continue-with-google",
    SESSION: "/auth/session",
  },
  projects: {
    INDEX: "/projects",
    BY_ID: (id: string) => `/projects/${id}`,
    CHAT: (id: string) => `/projects/${id}/chat`,
  },
};

export default API_ROUTES;
