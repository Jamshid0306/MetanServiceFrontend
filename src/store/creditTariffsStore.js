import { defineStore } from "pinia";

import { apiClient, getApiErrorMessage } from "@/lib/api";

const CREDIT_TARIFF_TTL_MS = 5 * 60 * 1000;

let tariffsCache = null;
let pendingTariffsRequest = null;

const createCacheEntry = (tariffs) => ({
  tariffs,
  updatedAt: Date.now(),
  expiresAt: Date.now() + CREDIT_TARIFF_TTL_MS,
});

const isFreshCacheEntry = (entry) => entry && entry.expiresAt > Date.now();

const normalizeTariff = (tariff) => {
  if (!tariff || typeof tariff !== "object") {
    return null;
  }

  const id = Number(tariff.id);
  const months = Number(tariff.months);
  const percent = Number(tariff.percent);
  const monthlyPercent = Number(tariff.monthly_percent);
  const minAmount = Number(tariff.min_amount);
  const maxAmount = Number(tariff.max_amount);

  if (!Number.isFinite(months) || months <= 0 || !Number.isFinite(percent) || percent <= 0) {
    return null;
  }

  return {
    id: Number.isFinite(id) && id > 0 ? id : null,
    name: String(tariff.name || "").trim(),
    months,
    percent,
    monthly_percent:
      Number.isFinite(monthlyPercent) && monthlyPercent > 0 ? monthlyPercent : null,
    min_amount: Number.isFinite(minAmount) && minAmount >= 0 ? minAmount : null,
    max_amount: Number.isFinite(maxAmount) && maxAmount >= 0 ? maxAmount : null,
  };
};

const normalizeTariffs = (rawTariffs = []) => {
  const seenMonths = new Set();

  return (Array.isArray(rawTariffs) ? rawTariffs : [])
    .map(normalizeTariff)
    .filter((tariff) => {
      if (!tariff || seenMonths.has(tariff.months)) {
        return false;
      }

      seenMonths.add(tariff.months);
      return true;
    })
    .sort((a, b) => a.months - b.months);
};

export const useCreditTariffsStore = defineStore("creditTariffsStore", {
  state: () => ({
    tariffs: [],
    loading: false,
    loaded: false,
    lastError: "",
    updatedAt: 0,
  }),
  actions: {
    async fetchTariffs(options = {}) {
      const force = Boolean(options.force);

      if (!force && isFreshCacheEntry(tariffsCache)) {
        this.tariffs = tariffsCache.tariffs;
        this.updatedAt = tariffsCache.updatedAt;
        this.loaded = true;
        this.lastError = "";
        return this.tariffs;
      }

      if (!force && pendingTariffsRequest) {
        try {
          const sharedEntry = await pendingTariffsRequest;
          this.tariffs = sharedEntry.tariffs;
          this.updatedAt = sharedEntry.updatedAt;
          this.loaded = true;
          this.lastError = "";
          return this.tariffs;
        } catch (error) {
          this.lastError = getApiErrorMessage(error, "Kredit tariflarini yuklab bo'lmadi.");
          if (tariffsCache?.tariffs?.length) {
            this.tariffs = tariffsCache.tariffs;
            this.updatedAt = tariffsCache.updatedAt;
            this.loaded = true;
            return this.tariffs;
          }

          this.tariffs = [];
          this.loaded = true;
          return [];
        }
      }

      this.loading = true;
      this.lastError = "";

      const request = apiClient
        .get("/products/credit/tariffs")
        .then((response) => {
          const tariffs = normalizeTariffs(response.data?.data);
          const entry = createCacheEntry(tariffs);
          tariffsCache = entry;
          return entry;
        })
        .finally(() => {
          pendingTariffsRequest = null;
        });

      pendingTariffsRequest = request;

      try {
        const entry = await request;
        this.tariffs = entry.tariffs;
        this.updatedAt = entry.updatedAt;
        this.loaded = true;
        return this.tariffs;
      } catch (error) {
        this.lastError = getApiErrorMessage(error, "Kredit tariflarini yuklab bo'lmadi.");
        if (tariffsCache?.tariffs?.length) {
          this.tariffs = tariffsCache.tariffs;
          this.updatedAt = tariffsCache.updatedAt;
          this.loaded = true;
          return this.tariffs;
        }

        this.tariffs = [];
        this.updatedAt = 0;
        this.loaded = true;
        return [];
      } finally {
        this.loading = false;
      }
    },
  },
});
