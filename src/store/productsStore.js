import { defineStore } from "pinia";
import { useLoaderStore } from "./loaderStore";
import { apiClient } from "@/lib/api";

export const useProductsStore = defineStore("productsStore", {
  state: () => ({
    products: [],
    loading: false,
    product: {},
  }),
  actions: {
    async fetchProducts(limit = 9, offset=0) {
      this.loading = true;
      try {
        const res = await apiClient.get("/products/products", {
          params: { limit, offset },
        });
        this.products = res.data.products;
        const loaderStore = useLoaderStore();
        loaderStore.loader = false;
        this.loading = false;
      } catch (err) {
        console.error("Xato:", err);
      } finally {
        this.loading = false;
      }
    },
    async fetchProductDetail(id) {
      try {
        const res = await apiClient.get(`/products/product/detail/${id}`);
        if (res.data) {
          this.product = res.data;
          const loaderStore = useLoaderStore();
          loaderStore.loader = false;
          return true;
        } else {
          this.product = null;
          return false;
        }
      } catch (err) {
        console.error("Xato:", err);
        this.product = null;
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});
