import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import axios from "axios";
import Cookie from "js-cookie";

/**
 * Axios instance with base URL and request interceptor
 */
const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
  config.headers["Content-Type"] = "application/json";
  config.headers["Accept"] = "application/json";
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log("🔵 Axios request:", config.method?.toUpperCase(), config.url);
  return config;
});

export default api;
