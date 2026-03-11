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
    updateQuantity(key, quantity) {
      const item = this.basket.find((p) => resolveBasketKey(p) === key);
      if (item) {
        const nextQuantity = Number(quantity);
        item.quantity = Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1;
      }
    },
    addToBasket(product) {
      const basketKey = resolveBasketKey(product);
      const existing = this.basket.find((p) => resolveBasketKey(p) === basketKey);
      const nextQuantity = Number(product.quantity);
      const safeQuantity = Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1;
      if (existing) {
        existing.quantity += safeQuantity;
      } else {
        this.basket.push({
          ...product,
          basket_key: basketKey,
          quantity: safeQuantity,
        });
      }
    },
    replaceBasketItem(oldKey, product) {
      const sourceIndex = this.basket.findIndex((p) => resolveBasketKey(p) === oldKey);
      if (sourceIndex === -1) return;

      const basketKey = resolveBasketKey(product);
      const nextQuantity = Number(product.quantity);
      const safeQuantity = Number.isFinite(nextQuantity) && nextQuantity > 0 ? nextQuantity : 1;
      const targetIndex = this.basket.findIndex(
        (p, index) => index !== sourceIndex && resolveBasketKey(p) === basketKey
      );

      if (targetIndex !== -1) {
        const mergedQuantity =
          Number(this.basket[targetIndex]?.quantity || 0) + safeQuantity;
        this.basket[targetIndex] = {
          ...this.basket[targetIndex],
          ...product,
          basket_key: basketKey,
          quantity: mergedQuantity,
        };
        this.basket.splice(sourceIndex, 1);
        return;
      }

      this.basket[sourceIndex] = {
        ...this.basket[sourceIndex],
        ...product,
        basket_key: basketKey,
        quantity: safeQuantity,
      };
    },

    removeFromBasket(key) {
      this.basket = this.basket.filter((p) => resolveBasketKey(p) !== key);
    },
    decreaseQuantity(key) {
      const item = this.basket.find((p) => resolveBasketKey(p) === key);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
      } else {
        this.removeFromBasket(key);
      }
    },
    clearBasket() {
      this.basket = [];
    },
  },
  persist: true,
});
