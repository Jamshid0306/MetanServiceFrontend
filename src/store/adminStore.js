import { defineStore } from "pinia";
import { useLoaderStore } from "@/store/loaderStore";
import {
  apiClient,
  clearAdminTokens,
  getApiErrorMessage,
  getStoredAccessToken,
  getStoredRefreshToken,
  isTokenExpired,
  refreshAdminSession,
  storeAdminTokens,
} from "@/lib/api";
import { useProductsStore } from "@/store/productsStore";

const SESSION_EXPIRED_MESSAGE = "Sessiya tugadi. Qaytadan login qiling.";
const isUnauthorizedError = (error) => Number(error?.response?.status) === 401;
const getInitialAccessToken = () => getStoredAccessToken();
const getInitialRefreshToken = () => getStoredRefreshToken();

export const useAdminStore = defineStore("admin", {
  state: () => ({
    isLogged: Boolean(getInitialAccessToken() || getInitialRefreshToken()),
    isRestoringSession: true,
    accessToken: getInitialAccessToken(),
    refreshToken: getInitialRefreshToken(),
    products: [],
    heroSlides: [],
    lastError: "",
  }),
  actions: {
    syncStoredSession() {
      this.accessToken = getStoredAccessToken();
      this.refreshToken = getStoredRefreshToken();
      this.isLogged = Boolean(this.accessToken || this.refreshToken);
    },

    applyAuthTokens(payload = {}) {
      const accessToken = payload?.access_token || payload?.accessToken || null;
      const refreshToken = payload?.refresh_token || payload?.refreshToken || null;

      if (!accessToken) {
        return false;
      }

      storeAdminTokens({ accessToken, refreshToken });
      this.syncStoredSession();
      this.isRestoringSession = false;
      this.lastError = "";
      return true;
    },

    async login(username, password) {
      this.lastError = "";
      this.isRestoringSession = false;

      try {
        const res = await apiClient.post(
          "/admin/login",
          { username, password },
          { skipAuth: true }
        );

        if (this.applyAuthTokens(res.data)) {
          return true;
        }

        this.logout();
        return false;
      } catch (err) {
        this.logout(getApiErrorMessage(err, "Login bajarilmadi."));
        return false;
      }
    },

    async refreshSession(message = SESSION_EXPIRED_MESSAGE) {
      try {
        const authData = await refreshAdminSession();

        if (authData?.accessToken) {
          this.syncStoredSession();
          this.isLogged = true;
          this.lastError = "";
          return true;
        }

        this.logout(message);
        return false;
      } catch (err) {
        this.logout(
          isUnauthorizedError(err) ? message : getApiErrorMessage(err, message)
        );
        return false;
      }
    },

    async ensureAccessToken() {
      this.syncStoredSession();

      if (this.accessToken && !isTokenExpired(this.accessToken)) {
        this.isLogged = true;
        return true;
      }

      if (!this.refreshToken) {
        this.logout(SESSION_EXPIRED_MESSAGE);
        return false;
      }

      return this.refreshSession();
    },

    async restoreSession() {
      this.isRestoringSession = true;
      this.lastError = "";

      try {
        this.syncStoredSession();

        if (!this.accessToken && !this.refreshToken) {
          this.isLogged = false;
          return false;
        }

        return await this.ensureAccessToken();
      } finally {
        this.isRestoringSession = false;
      }
    },

    handleAdminError(err, fallback) {
      if (isUnauthorizedError(err)) {
        this.logout(SESSION_EXPIRED_MESSAGE);
        return true;
      }

      this.lastError = getApiErrorMessage(err, fallback);
      return false;
    },

    logout(message = "") {
      clearAdminTokens();
      this.isLogged = false;
      this.isRestoringSession = false;
      this.accessToken = null;
      this.refreshToken = null;
      this.products = [];
      this.heroSlides = [];
      this.lastError = message;
    },

    async createProduct(formData) {
      if (!(await this.ensureAccessToken())) return false;
      this.lastError = "";

      try {
        const res = await apiClient.post("/products/create", formData);
        if (res.data.success) {
          useProductsStore().invalidateCaches();
          await this.getProducts();
          return true;
        }
        return false;
      } catch (err) {
        this.handleAdminError(err, "Mahsulot yaratib bo'lmadi.");
        return false;
      }
    },

    async getProducts() {
      if (!(await this.ensureAccessToken())) return false;

      const loaderStore = useLoaderStore();
      this.lastError = "";

      try {
        const res = await apiClient.get("/products/products", {
          params: {
            limit: 1000,
            offset: 0,
            include_full_details: true,
          },
        });
        const data = res.data;
        this.products = Array.isArray(data) ? data : data?.products || [];
        return true;
      } catch (err) {
        this.handleAdminError(err, "Admin mahsulotlari yuklanmadi.");
        this.products = [];
        return false;
      } finally {
        loaderStore.loader = false;
      }
    },

    async updateProduct(productId, formData) {
      if (!(await this.ensureAccessToken())) return false;
      this.lastError = "";

      try {
        const res = await apiClient.put(`/products/update/${productId}`, formData);

        if (res.data && res.data.success) {
          useProductsStore().invalidateCaches();
          await this.getProducts();
          return true;
        }

        console.warn("Update failed:", res.data);
        return false;
      } catch (err) {
        this.handleAdminError(err, "Mahsulotni yangilab bo'lmadi.");
        return false;
      }
    },

    async deleteProduct(id) {
      if (!(await this.ensureAccessToken())) return false;
      this.lastError = "";

      try {
        await apiClient.delete(`/products/${id}`);
        useProductsStore().invalidateCaches();
        await this.getProducts();
        return true;
      } catch (err) {
        this.handleAdminError(err, "Mahsulotni o'chirib bo'lmadi.");
        return false;
      }
    },

    async getHeroSlides() {
      if (!(await this.ensureAccessToken())) return false;
      this.lastError = "";

      try {
        const res = await apiClient.get("/hero-slides/admin");
        this.heroSlides = Array.isArray(res.data?.slides) ? res.data.slides : [];
        return true;
      } catch (err) {
        this.handleAdminError(err, "Hero bannerlar yuklanmadi.");
        this.heroSlides = [];
        return false;
      }
    },

    async createHeroSlide(formData) {
      if (!(await this.ensureAccessToken())) return false;
      this.lastError = "";

      try {
        const res = await apiClient.post("/hero-slides", formData);
        if (res.data?.success) {
          await this.getHeroSlides();
          return true;
        }
        return false;
      } catch (err) {
        this.handleAdminError(err, "Hero banner qo'shib bo'lmadi.");
        return false;
      }
    },

    async updateHeroSlide(slideId, formData) {
      if (!(await this.ensureAccessToken())) return false;
      this.lastError = "";

      try {
        const res = await apiClient.put(`/hero-slides/${slideId}`, formData);
        if (res.data?.success) {
          await this.getHeroSlides();
          return true;
        }
        return false;
      } catch (err) {
        this.handleAdminError(err, "Hero bannerni yangilab bo'lmadi.");
        return false;
      }
    },

    async deleteHeroSlide(slideId) {
      if (!(await this.ensureAccessToken())) return false;
      this.lastError = "";

      try {
        const res = await apiClient.delete(`/hero-slides/${slideId}`);
        if (res.data?.success) {
          this.heroSlides = this.heroSlides.filter((slide) => slide.id !== slideId);
          return true;
        }
        return false;
      } catch (err) {
        this.handleAdminError(err, "Hero bannerni o'chirib bo'lmadi.");
        return false;
      }
    },
  },
});
