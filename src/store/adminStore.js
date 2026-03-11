import { defineStore } from "pinia";
import { useLoaderStore } from "@/store/loaderStore";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { useProductsStore } from "@/store/productsStore";

export const useAdminStore = defineStore("admin", {
  state: () => ({
    isLogged: !!localStorage.getItem("access_token"),
    accessToken: localStorage.getItem("access_token") || null,
    products: [],
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
        this.lastError = getApiErrorMessage(err, "Login bajarilmadi.");
        this.logout();
        return false;
      }
    },

    logout() {
      this.isLogged = false;
      this.accessToken = null;
      this.lastError = "";
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
        this.lastError = getApiErrorMessage(err, "Mahsulot yaratib bo'lmadi.");
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
      } catch (err) {
        this.lastError = getApiErrorMessage(err, "Admin mahsulotlari yuklanmadi.");
        this.products = [];
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
        this.lastError = getApiErrorMessage(err, "Mahsulotni yangilab bo'lmadi.");
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
        this.lastError = getApiErrorMessage(err, "Mahsulotni o'chirib bo'lmadi.");
        return false;
      }
    },
  },
});
