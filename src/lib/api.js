import axios from "axios";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const shouldSendNgrokHeader = (baseUrl) => {
  try {
    return new URL(baseUrl).hostname.includes("ngrok");
  } catch {
    return false;
  }
};

const resolveApiBaseUrl = () => {
  const envValue = trimTrailingSlash(import.meta.env.VITE_API_URL || "");
  if (envValue) {
    return envValue;
  }

  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }

  return trimTrailingSlash(origin);
};

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: shouldSendNgrokHeader(API_BASE_URL)
    ? {
        "ngrok-skip-browser-warning": "true",
      }
    : {},
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token");
    if (token && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

export const resolveAssetUrl = (assetPath) => {
  if (!assetPath) {
    return "";
  }

  if (/^https?:\/\//i.test(assetPath)) {
    return assetPath;
  }

  const normalizedPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return new URL(normalizedPath, `${API_BASE_URL}/`).toString();
};

export const resolveAssetUrls = (assetPaths) =>
  Array.isArray(assetPaths)
    ? assetPaths.map(resolveAssetUrl).filter(Boolean)
    : [];
