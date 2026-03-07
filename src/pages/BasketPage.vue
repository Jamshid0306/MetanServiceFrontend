<script setup>
import { computed } from "vue";
import { useBasketStore } from "../store/basketStore";
import { ShoppingCart, Trash2 } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import LeftArrow from "@/components/icons/LeftArrow.vue";
import { resolveAssetUrl, resolveAssetUrls } from "@/lib/api";

const { t, locale } = useI18n();
const basketStore = useBasketStore();
const router = useRouter();
const normalizeImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) {
    return resolveAssetUrls(images);
  }
  const resolved = resolveAssetUrl(images);
  return resolved ? [resolved] : [];
};

const extractNumericOrText = (price) => {
  if (!price) return "Narx yo‘q";
  const numeric = parseInt(price.toString().replace(/[^\d]/g, ""), 10);
  return Number.isNaN(numeric) ? price : numeric;
};

const totalPrice = computed(() => {
  let sum = 0;
  let hasText = false;

  basketStore.basket.forEach((p) => {
    const val = extractNumericOrText(p[`price_${locale.value}`]);
    if (typeof val === "number") {
      sum += val * p.quantity;
    } else {
      hasText = true;
    }
  });

  if (hasText && sum === 0) {
    return "Narxni so’rang";
  }
  return sum;
});

const formatPrice = (price) => {
  if (!price) return "";
  const numeric = parseInt(price.toString().replace(/[^\d]/g, ""), 10);
  if (Number.isNaN(numeric)) return price;
  return numeric.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " UZS";
};

const removeItem = (id) => basketStore.removeFromBasket(id);
const goToProduct = (id) =>
  router.push({ name: "ProductDetail", params: { id } });
</script>

<template>
  <div class="basket-page max-w-6xl mx-auto py-12 px-4 mt-[30px]">
    <div class="basket-header flex my-4 items-center gap-12">
      <RouterLink class="basket-back hover:scale-105" to="/">
        <LeftArrow :size="30" />
      </RouterLink>
      <h1 class="basket-title text-3xl font-bold text-blue-800 flex items-center gap-3 animate-fade">
        <ShoppingCart class="w-6 h-6" /> {{ t("basket") }}
      </h1>
    </div>

    <div class="min-h-[50vh]">
      <transition-group
        name="list"
        tag="div"
        v-if="basketStore.basket.length"
        class="grid gap-6"
      >
        <div
          v-for="item in basketStore.basket"
          :key="item.id"
          class="basket-card bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col sm:flex-row items-center sm:items-stretch group"
        >
          <div
            class="basket-media flex-shrink-0 w-full sm:w-40 h-40 flex items-center justify-center cursor-pointer"
            @click="goToProduct(item.id)"
          >
            <img
              :src="normalizeImages(item.images)[0]"
              class="w-28 h-28 object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <hr class="basket-divider h-full w-[1px] bg-gray-300" />
          <div
            class="basket-info flex flex-col justify-center flex-1 px-5 py-4 cursor-pointer"
            @click="goToProduct(item.id)"
          >
            <h2 class="basket-name font-semibold text-lg mb-1">{{ item[`name_${locale}`] }}</h2>
          </div>
          <div
            class="basket-controls flex items-center justify-end gap-6 px-5 py-4 border-t sm:border-t-0 sm:border-l border-gray-100"
          >
            <span class="basket-qty flex items-center border rounded-xl overflow-hidden shadow-sm">
              <button
                @click="basketStore.decreaseQuantity(item.id)"
                class="basket-qty-btn w-10 h-10 flex items-center justify-center text-lg font-bold text-blue-700 bg-blue-50 hover:bg-blue-200 cursor-pointer transition-all duration-300"
              >
                –
              </button>

              <input
                type="text"
                v-model="item.quantity"
                class="basket-qty-input w-14 text-center font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                @input="item.quantity = item.quantity.replace(/[^0-9]/g, '')"
                @blur="
                  if (!item.quantity || parseInt(item.quantity) < 1)
                    item.quantity = 1;
                "
                @change="basketStore.updateQuantity(item.id, parseInt(item.quantity))"
              />

              <button
                @click="basketStore.updateQuantity(item.id, item.quantity + 1)"
                class="basket-qty-btn w-10 h-10 flex items-center justify-center text-lg font-bold text-blue-700 bg-blue-50 hover:bg-blue-200 cursor-pointer transition-all duration-300"
              >
                +
              </button>
            </span>

            <span class="basket-item-price text-xl font-bold text-blue-800 min-w-[140px] text-right">
              {{
                typeof extractNumericOrText(item[`price_${locale}`]) === "number"
                  ? formatPrice(
                      extractNumericOrText(item[`price_${locale}`]) * item.quantity
                    )
                  : extractNumericOrText(item[`price_${locale}`])
              }}
            </span>

            <button
              @click="removeItem(item.id)"
              class="basket-remove p-2 bg-blue-50 rounded-xl hover:bg-blue-200 cursor-pointer transition-all duration-300"
            >
              <Trash2 class="w-5 h-5 text-blue-700" />
            </button>
          </div>
        </div>
      </transition-group>

      <div v-else class="basket-empty text-center py-28 text-gray-400 animate-fade">
        <p class="text-xl mb-4">{{ t("empty") }}</p>
        <button
          @click="router.push('/products')"
          class="basket-empty-btn bg-blue-700 text-white py-3 px-6 rounded-xl hover:bg-blue-800 transition-all duration-300"
        >
          {{ t("seeProducts") }}
        </button>
      </div>

      <div
        class="basket-total-row flex justify-end items-center mt-10 gap-6 animate-fade"
        v-if="basketStore.basket.length"
      >
        <p class="basket-total text-2xl font-bold text-blue-800">
          {{ t("allBasket") }}: {{ formatPrice(totalPrice) }}
        </p>
        <button
          @click="basketStore.clearBasket()"
          class="basket-clear bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-900 transition-all duration-300"
        >
          {{ t("clear") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basket-page {
  background:
    radial-gradient(circle at 0% 0%, rgba(24, 79, 149, 0.08), transparent 32%),
    radial-gradient(circle at 100% 100%, rgba(15, 43, 102, 0.06), transparent 34%);
}

.basket-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(20, 54, 108, 0.18);
  border-radius: 12px;
  background: #ffffff;
  color: #1a447f;
  padding: 2px;
}

.basket-title {
  color: #14325f;
}

.basket-card {
  border: 1px solid rgba(20, 54, 108, 0.14);
  box-shadow: 0 12px 20px rgba(8, 30, 72, 0.08);
}

.basket-card:hover {
  box-shadow: 0 18px 28px rgba(8, 30, 72, 0.14);
}

.basket-media {
  background: linear-gradient(180deg, #fbfdff, #f2f7ff);
}

.basket-divider {
  background: rgba(20, 54, 108, 0.16);
}

.basket-name {
  color: #183a6a;
}

.basket-controls {
  border-color: rgba(20, 54, 108, 0.12);
}

.basket-qty {
  border-color: rgba(20, 54, 108, 0.18);
}

.basket-qty-btn {
  background: #edf3ff;
}

.basket-qty-btn:hover {
  background: #dae8ff;
}

.basket-qty-input {
  color: #253a5a;
}

.basket-item-price {
  color: #123660;
}

.basket-remove {
  background: #edf3ff;
}

.basket-remove:hover {
  background: #dae8ff;
}

.basket-empty {
  color: #6e7f9c;
}

.basket-empty-btn {
  background: #143d7a;
}

.basket-empty-btn:hover {
  background: #0f2f61;
}

.basket-total {
  color: #14325f;
}

.basket-clear {
  background: #143d7a;
  box-shadow: 0 12px 20px rgba(8, 30, 72, 0.2);
}

.basket-clear:hover {
  background: #0f2f61;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.45s cubic-bezier(0.25, 1, 0.5, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(25px) scale(0.95);
}
.list-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.list-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.list-move {
  transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
}

@media (max-width: 640px) {
  .basket-header {
    gap: 0.8rem;
  }

  .basket-title {
    font-size: 1.5rem;
  }

  .basket-controls {
    width: 100%;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .basket-item-price {
    min-width: auto;
    font-size: 1rem;
  }

  .basket-total-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
