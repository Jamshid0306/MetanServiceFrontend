import { defineStore } from "pinia";
import { useLoaderStore } from "./loaderStore";
import { apiClient, getApiErrorMessage } from "@/lib/api";

const PRODUCT_LIST_TTL_MS = 60 * 1000;
const PRODUCT_DETAIL_TTL_MS = 2 * 60 * 1000;

const listCache = new Map();
const detailCache = new Map();
const pendingListRequests = new Map();
const pendingDetailRequests = new Map();

const buildListCacheKey = (limit, offset, includeFullDetails) =>
  JSON.stringify({
    limit,
    offset,
    includeFullDetails: Boolean(includeFullDetails),
  });

const createCacheEntry = (data, ttlMs) => ({
  data,
  expiresAt: Date.now() + ttlMs,
});

const isFreshCacheEntry = (entry) => entry && entry.expiresAt > Date.now();

export const useProductsStore = defineStore("productsStore", {
  state: () => ({
    products: [],
    loading: false,
    product: null,
    lastError: "",
  }),
  actions: {
    cacheProduct(product) {
      if (!product?.id) return;
      detailCache.set(product.id, createCacheEntry(product, PRODUCT_DETAIL_TTL_MS));
    },

    cacheProducts(products = []) {
      products.forEach((product) => this.cacheProduct(product));
    },

    invalidateCaches() {
      listCache.clear();
      detailCache.clear();
      pendingListRequests.clear();
      pendingDetailRequests.clear();
    },

    async fetchProducts(limit = 9, offset = 0, options = {}) {
      const loaderStore = useLoaderStore();
      const includeFullDetails = Boolean(options.includeFullDetails);
      const force = Boolean(options.force);
      const cacheKey = buildListCacheKey(limit, offset, includeFullDetails);
      const cachedEntry = listCache.get(cacheKey);

      if (!force && isFreshCacheEntry(cachedEntry)) {
        this.products = cachedEntry.data.products;
        this.lastError = "";
        return cachedEntry.data;
      }

      if (!force && pendingListRequests.has(cacheKey)) {
        try {
          const sharedResponse = await pendingListRequests.get(cacheKey);
          this.products = sharedResponse.products;
          this.lastError = "";
          return sharedResponse;
        } catch (err) {
          this.lastError = getApiErrorMessage(err, "Mahsulotlarni yuklab bo'lmadi.");
          if (cachedEntry?.data?.products?.length) {
            this.products = cachedEntry.data.products;
            return cachedEntry.data;
          }

          this.products = [];
          return {
            total: 0,
            limit,
            offset,
            products: [],
          };
        }
      }

      this.loading = true;
      this.lastError = "";

      const request = apiClient
        .get("/products/products", {
          params: {
            limit,
            offset,
            include_full_details: includeFullDetails,
          },
        })
        .then((res) => {
          const data = {
            total: Number(res.data?.total || 0),
            limit: Number(res.data?.limit || limit),
            offset: Number(res.data?.offset || offset),
            products: Array.isArray(res.data?.products) ? res.data.products : [],
          };

          listCache.set(cacheKey, createCacheEntry(data, PRODUCT_LIST_TTL_MS));
          this.cacheProducts(data.products);
          return data;
        })
        .finally(() => {
          pendingListRequests.delete(cacheKey);
        });

      pendingListRequests.set(cacheKey, request);

      try {
        const data = await request;
        this.products = data.products;
        return data;
      } catch (err) {
        this.lastError = getApiErrorMessage(err, "Mahsulotlarni yuklab bo'lmadi.");
        if (cachedEntry?.data?.products?.length) {
          this.products = cachedEntry.data.products;
          return cachedEntry.data;
        }

        this.products = [];
        return {
          total: 0,
          limit,
          offset,
          products: [],
        };
      } finally {
        this.loading = false;
        loaderStore.loader = false;
      }
    },

    async fetchProductDetail(id, options = {}) {
      const loaderStore = useLoaderStore();
      const force = Boolean(options.force);
      const cachedEntry = detailCache.get(id);

      if (!force && isFreshCacheEntry(cachedEntry)) {
        this.product = cachedEntry.data;
        this.lastError = "";
        return true;
      }

      if (!force && pendingDetailRequests.has(id)) {
        try {
          const sharedProduct = await pendingDetailRequests.get(id);
          this.product = sharedProduct;
          this.lastError = "";
          return true;
        } catch (err) {
          this.lastError = getApiErrorMessage(err, "Mahsulot tafsilotini yuklab bo'lmadi.");
          if (cachedEntry?.data) {
            this.product = cachedEntry.data;
            return true;
          }

          this.product = null;
          return false;
        }
      }

      this.loading = true;
      this.lastError = "";

      const request = apiClient
        .get(`/products/product/detail/${id}`)
        .then((res) => {
          if (!res.data) {
            throw new Error("Product not found");
          }

          this.cacheProduct(res.data);
          return res.data;
        })
        .finally(() => {
          pendingDetailRequests.delete(id);
        });

      pendingDetailRequests.set(id, request);

      try {
        const product = await request;
        this.product = product;
        return true;
      } catch (err) {
        this.lastError = getApiErrorMessage(err, "Mahsulot tafsilotini yuklab bo'lmadi.");
        if (cachedEntry?.data) {
          this.product = cachedEntry.data;
          return true;
        }

        this.product = null;
        return false;
      } finally {
        this.loading = false;
        loaderStore.loader = false;
      }
    },
  },
});
