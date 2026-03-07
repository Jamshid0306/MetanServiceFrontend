// basketStore.js (Pinia)
import { defineStore } from "pinia";

export const useBasketStore = defineStore("basket", {
  state: () => ({
    basket: [],
  }),
  actions: {
    updateQuantity(id, quantity) {
      const item = this.basket.find((p) => p.id === id);
      if (item) {
        item.quantity = quantity > 0 ? quantity : 1;
      }
    },
    addToBasket(product) {
      const existing = this.basket.find((p) => p.id === product.id);
      if (existing) {
        existing.quantity += product.quantity || 1; // ✨ quantity ni hisobga oladi
      } else {
        this.basket.push({ ...product, quantity: product.quantity || 1 });
      }
    },

    removeFromBasket(id) {
      this.basket = this.basket.filter((p) => p.id !== id);
    },
    decreaseQuantity(id) {
      const item = this.basket.find((p) => p.id === id);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
      } else {
        this.removeFromBasket(id);
      }
    },
    clearBasket() {
      this.basket = [];
    },
  },
  persist: true,
});
