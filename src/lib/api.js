import axios from "axios";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
const MAX_GET_RETRIES = Number(import.meta.env.VITE_API_RETRY_COUNT || 2);
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

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
  timeout: REQUEST_TIMEOUT_MS,
  headers: shouldSendNgrokHeader(API_BASE_URL)
    ? {
        "ngrok-skip-browser-warning": "true",
        Accept: "application/json",
      }
    : {
        Accept: "application/json",
      },
});

apiClient.interceptors.request.use((config) => {
  config.metadata = {
    retryCount: config.metadata?.retryCount || 0,
  };

  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("access_token");
    if (token && !config.headers?.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

const shouldRetryRequest = (error) => {
  const method = String(error.config?.method || "get").toLowerCase();
  const status = error.response?.status;
  const retryCount = Number(error.config?.metadata?.retryCount || 0);
  const isNetworkError = !error.response;
  const isTimeout = error.code === "ECONNABORTED";
  const isServerError = typeof status === "number" && status >= 500;

  return (
    RETRYABLE_METHODS.has(method) &&
    retryCount < MAX_GET_RETRIES &&
    (isNetworkError || isTimeout || isServerError)
  );
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (shouldRetryRequest(error)) {
      error.config.metadata.retryCount += 1;
      await wait(300 * error.config.metadata.retryCount);
      return apiClient(error.config);
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error, fallback = "So'rov bajarilmadi.") => {
  const responseMessage =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.response?.data?.error;

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return responseMessage;
  }

  if (error?.code === "ECONNABORTED") {
    return "Server javobi juda sekin bo'ldi. Qaytadan urinib ko'ring.";
  }

  if (!error?.response) {
    return "Server bilan aloqa bo'lmadi. Internet yoki backend holatini tekshiring.";
  }

  return fallback;
};

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
