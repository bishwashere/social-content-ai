import { AUTH_TOKEN_COOKIE_NAME } from "@/constants/common";
import axios from "axios";
import Cookie from "js-cookie";

/**
 * Axios instance with base URL and request interceptor
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL + "/api",
});

api.interceptors.request.use((config) => {
  const token = Cookie.get(AUTH_TOKEN_COOKIE_NAME);
  config.headers["Content-Type"] = "application/json";
  config.headers["Accept"] = "application/json";
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
