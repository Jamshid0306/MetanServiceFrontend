import axios from "axios";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);
const MAX_GET_RETRIES = Number(import.meta.env.VITE_API_RETRY_COUNT || 2);
const RETRYABLE_METHODS = new Set(["get", "head", "options"]);
const ACCESS_TOKEN_STORAGE_KEY = "access_token";
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";
const TOKEN_EXPIRY_SKEW_MS = 30 * 1000;

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const getStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;
const decodeJwtPayload = (token) => {
  if (!token || typeof window === "undefined") {
    return null;
  }

  const tokenParts = String(token).split(".");
  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const normalized = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

const shouldSendNgrokHeader = (baseUrl) => {
  try {
    return new URL(baseUrl).hostname.includes("ngrok");
  } catch {
    return false;
  }
};

const resolveProductionApiBaseUrl = (hostname) => {
  const normalizedHostname = String(hostname || "").trim().toLowerCase();

  if (
    normalizedHostname === "urganch-metan-servis.uz" ||
    normalizedHostname === "www.urganch-metan-servis.uz"
  ) {
    return "https://api.urganch-metan-servis.uz";
  }

  if (
    normalizedHostname === "urganchmetanservice.uz" ||
    normalizedHostname === "www.urganchmetanservice.uz"
  ) {
    return "https://api.urganchmetanservice.uz";
  }

  return "";
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

  const productionApiBaseUrl = resolveProductionApiBaseUrl(hostname);
  if (productionApiBaseUrl) {
    return productionApiBaseUrl;
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

let refreshSessionPromise = null;

export const getStoredAccessToken = () =>
  getStorage()?.getItem(ACCESS_TOKEN_STORAGE_KEY) || null;

export const getStoredRefreshToken = () =>
  getStorage()?.getItem(REFRESH_TOKEN_STORAGE_KEY) || null;

export const storeAdminTokens = ({ accessToken = null, refreshToken = null } = {}) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  if (accessToken) {
    storage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  } else {
    storage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  if (refreshToken) {
    storage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
  } else {
    storage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
};

export const clearAdminTokens = () => {
  storeAdminTokens({ accessToken: null, refreshToken: null });
};

export const isTokenExpired = (token) => {
  const exp = Number(decodeJwtPayload(token)?.exp || 0);

  if (!exp) {
    return false;
  }

  return exp * 1000 <= Date.now() + TOKEN_EXPIRY_SKEW_MS;
};

export const refreshAdminSession = async () => {
  if (refreshSessionPromise) {
    return refreshSessionPromise;
  }

  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) {
    return null;
  }

  refreshSessionPromise = apiClient
    .post(
      "/admin/refresh",
      { refresh_token: refreshToken },
      {
        skipAuth: true,
        skipAuthRefresh: true,
      }
    )
    .then((response) => {
      const nextAccessToken = response.data?.access_token || null;
      const nextRefreshToken = response.data?.refresh_token || null;

      if (!nextAccessToken) {
        clearAdminTokens();
        return null;
      }

      storeAdminTokens({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      });

      return {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      };
    })
    .catch((error) => {
      clearAdminTokens();
      throw error;
    })
    .finally(() => {
      refreshSessionPromise = null;
    });

  return refreshSessionPromise;
};

apiClient.interceptors.request.use((config) => {
  config.metadata = {
    retryCount: config.metadata?.retryCount || 0,
  };

  if (config.skipAuth) {
    return config;
  }

  const token = getStoredAccessToken();
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
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
    const originalRequest = error?.config;
    const requestUrl = String(originalRequest?.url || "");
    const isUnauthorized = Number(error?.response?.status) === 401;
    const shouldTryRefresh =
      isUnauthorized &&
      originalRequest &&
      !originalRequest._retriedWithRefresh &&
      !originalRequest.skipAuthRefresh &&
      !requestUrl.includes("/admin/login") &&
      !requestUrl.includes("/admin/refresh") &&
      Boolean(getStoredRefreshToken());

    if (shouldTryRefresh) {
      originalRequest._retriedWithRefresh = true;

      try {
        const authData = await refreshAdminSession();
        if (authData?.accessToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${authData.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

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

  if (Array.isArray(responseMessage) && responseMessage.length) {
    return responseMessage
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join("; ");
  }

  if (responseMessage && typeof responseMessage === "object") {
    return JSON.stringify(responseMessage);
  }

  if (error?.response?.data && typeof error.response.data === "object") {
    return JSON.stringify(error.response.data);
  }

  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
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
