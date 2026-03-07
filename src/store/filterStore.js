import { defineStore } from "pinia";
import { apiClient } from "@/lib/api";

export const useFilterStore = defineStore("filterStore", {
  state: () => ({
    products: [],
    loading: false,
  }),
  actions: {
    async fetchProducts(filters = {}) {
      this.loading = true;
      try {
        const res = await apiClient.get("/products/filter", {
          params: filters,
        });
        const products = res.data?.products || [];

        this.products = products;
      } catch {
        this.products = [];
      } finally {
        this.loading = false;
      }
    },
  },
});
