import { defineStore } from "pinia";
import { useLoaderStore } from "@/store/loaderStore";
import { apiClient } from "@/lib/api";

export const useAdminStore = defineStore("admin", {
  state: () => ({
    isLogged: !!localStorage.getItem("access_token"),
    accessToken: localStorage.getItem("access_token") || null,
    showProductsView: false,
    showStatistics: true,
    products: [],
  }),
  actions: {
    async login(username, password) {
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
        console.error(err);
        this.logout();
        return false;
      }
    },

    logout() {
      this.isLogged = false;
      this.accessToken = null;
      localStorage.removeItem("access_token");
    },

    async createProduct(formData) {
      if (!this.accessToken) return;
      try {
        const res = await apiClient.post("/products/create", formData);
        if (res.data.success) await this.getProducts();
      } catch (err) {
        console.error(err);
      }
    },

    async getProducts() {
      try {
        const res = await apiClient.get("/products/products");
        const data = res.data;
        this.products = Array.isArray(data) ? data : data?.products || [];
        useLoaderStore().loader = false;
      } catch (err) {
        console.error(err);
      }
    },

    async updateProduct(productId, formData) {
      if (!this.accessToken) return;
      try {
        const res = await apiClient.put(`/products/update/${productId}`, formData);

        if (res.data && res.data.success) {
          await this.getProducts();
        } else {
          console.warn("Update failed:", res.data);
        }
      } catch (err) {
        console.error(err);
      }
    },

    async deleteProduct(id) {
      if (!this.accessToken) return;
      try {
        await apiClient.delete(`/products/${id}`);
        await this.getProducts();
      } catch (err) {
        console.error(err);
      }
    },
  },
});
