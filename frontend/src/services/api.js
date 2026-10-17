import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:5000/api/v1" : null);

if (!API_BASE_URL) {
  throw new Error("VITE_API_URL must be configured for production builds");
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";

    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register");
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("token");
      delete api.defaults.headers.common.Authorization;
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
