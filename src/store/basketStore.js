// basketStore.js (Pinia)
import { defineStore } from "pinia";
import { buildBasketKey } from "@/lib/productOptions";

const resolveBasketKey = (product) =>
  product?.basket_key || buildBasketKey(product?.id, product?.selected_options || []);

export const useBasketStore = defineStore("basket", {
  state: () => ({
    basket: [],
  }),
  actions: {
    normalizeBasket() {
      const normalized = [];
      const seenKeys = new Set();

      this.basket.forEach((item) => {
        const basketKey = resolveBasketKey(item);
        if (seenKeys.has(basketKey)) {
          return;
        }

        seenKeys.add(basketKey);
        normalized.push({
          ...item,
          basket_key: basketKey,
          quantity: 1,
        });
      });

      this.basket = normalized;
    },
    updateQuantity(key, quantity) {
      const item = this.basket.find((p) => resolveBasketKey(p) === key);
      if (item) {
        item.quantity = 1;
      }
    },
    addToBasket(product) {
      const basketKey = resolveBasketKey(product);
      const existing = this.basket.find((p) => resolveBasketKey(p) === basketKey);
      if (existing) {
        existing.quantity = 1;
      } else {
        this.basket.push({
          ...product,
          basket_key: basketKey,
          quantity: 1,
        });
      }
    },
    replaceBasketItem(oldKey, product) {
      const sourceIndex = this.basket.findIndex((p) => resolveBasketKey(p) === oldKey);
      if (sourceIndex === -1) return;

      const basketKey = resolveBasketKey(product);
      const targetIndex = this.basket.findIndex(
        (p, index) => index !== sourceIndex && resolveBasketKey(p) === basketKey
      );

      if (targetIndex !== -1) {
        this.basket[targetIndex] = {
          ...this.basket[targetIndex],
          ...product,
          basket_key: basketKey,
          quantity: 1,
        };
        this.basket.splice(sourceIndex, 1);
        return;
      }

      this.basket[sourceIndex] = {
        ...this.basket[sourceIndex],
        ...product,
        basket_key: basketKey,
        quantity: 1,
      };
    },

    removeFromBasket(key) {
      this.basket = this.basket.filter((p) => resolveBasketKey(p) !== key);
    },
    decreaseQuantity(key) {
      this.removeFromBasket(key);
    },
    clearBasket() {
      this.basket = [];
    },
  },
  persist: true,
});
