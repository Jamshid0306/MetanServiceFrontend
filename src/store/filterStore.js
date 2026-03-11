import { defineStore } from "pinia";
import { useProductsStore } from "@/store/productsStore";

export const useFilterStore = defineStore("filterStore", {
  state: () => ({
    products: [],
    loading: false,
    lastError: "",
  }),
  actions: {
    async fetchProducts(options = {}) {
      this.loading = true;
      this.lastError = "";

      try {
        const productsStore = useProductsStore();
        const response = await productsStore.fetchProducts(1000, 0, {
          force: Boolean(options.force),
          includeFullDetails: false,
        });

        this.products = Array.isArray(response?.products) ? response.products : [];
        this.lastError = productsStore.lastError || "";
      } catch (err) {
        this.products = [];
        this.lastError = "Mahsulotlar filtr uchun yuklanmadi.";
      } finally {
        this.loading = false;
      }
    },
  },
});
