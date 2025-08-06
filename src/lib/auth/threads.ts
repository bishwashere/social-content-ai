export const authenticateWithThreads = () => {
  // Store current route so we can return here after auth
  if (typeof window !== "undefined") {
    const currentUrl = window.location.pathname + window.location.search;
    localStorage.setItem("threads_return_url", currentUrl);
    window.location.href = `/api/threads/auth?return_url=${encodeURIComponent(
      currentUrl
    )}`;
  }
};
