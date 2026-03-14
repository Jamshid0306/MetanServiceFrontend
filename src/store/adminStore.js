import { defineStore } from "pinia";
import { useLoaderStore } from "@/store/loaderStore";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { useProductsStore } from "@/store/productsStore";

const isUnauthorizedError = (error) => Number(error?.response?.status) === 401;

export const useAdminStore = defineStore("admin", {
  state: () => ({
    isLogged: !!localStorage.getItem("access_token"),
    accessToken: localStorage.getItem("access_token") || null,
    products: [],
    heroSlides: [],
    lastError: "",
  }),
  actions: {
    async login(username, password) {
      this.lastError = "";
      try {
        const res = await apiClient.post("/admin/login", { username, password });

        if (res.data.access_token) {
          this.isLogged = true;
          this.accessToken = res.data.access_token;
          localStorage.setItem("access_token", res.data.access_token);
          return true;
        }

        this.logout();
        return false;
      } catch (err) {
        this.logout(getApiErrorMessage(err, "Login bajarilmadi."));
        return false;
      }
    },

    handleAdminError(err, fallback) {
      if (isUnauthorizedError(err)) {
        this.logout("Sessiya tugadi. Qaytadan login qiling.");
        return true;
      }

      this.lastError = getApiErrorMessage(err, fallback);
      return false;
    },

    logout(message = "") {
      this.isLogged = false;
      this.accessToken = null;
      this.products = [];
      this.heroSlides = [];
      this.lastError = message;
      localStorage.removeItem("access_token");
    },

    async createProduct(formData) {
      if (!this.accessToken) return;
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
      if (!this.accessToken) return;
      this.lastError = "";
      try {
        const res = await apiClient.put(`/products/update/${productId}`, formData);

        if (res.data && res.data.success) {
          useProductsStore().invalidateCaches();
          await this.getProducts();
          return true;
        } else {
          console.warn("Update failed:", res.data);
          return false;
        }
      } catch (err) {
        this.handleAdminError(err, "Mahsulotni yangilab bo'lmadi.");
        return false;
      }
    },

    async deleteProduct(id) {
      if (!this.accessToken) return;
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
      if (!this.accessToken) return false;
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
      if (!this.accessToken) return false;
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
      if (!this.accessToken) return false;
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
      if (!this.accessToken) return false;
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
