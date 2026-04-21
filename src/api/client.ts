import axios from "axios";
import { clearToken, getToken } from "../auth/tokenStorage";

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "https://mycampusapi.bpspurnea.com/api/";
const appBasePath = import.meta.env.BASE_URL ?? "/";

function normalizeApiBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.toLowerCase().endsWith("/api")) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

const apiBaseUrl = normalizeApiBaseUrl(rawBaseUrl);
const loginPath = new URL("login", window.location.origin + appBasePath).pathname;

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status as number | undefined;
    if (status === 401) {
      clearToken();
      const onLoginPage = window.location.pathname.toLowerCase().includes("/login");
      if (!onLoginPage) {
        window.location.replace(loginPath);
      }
    }
    return Promise.reject(error);
  }
);
