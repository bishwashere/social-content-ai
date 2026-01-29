import Cookies from "js-cookie";
export const authenticateWithInstagram = () => {
  // Store current route so we can return here after auth
  if (typeof window !== "undefined") {
    const currentUrl = window.location.pathname + window.location.search;
    Cookies.set("instagram_return_url", currentUrl);
    window.location.href = `/api/instagram/auth`;
  }
};
