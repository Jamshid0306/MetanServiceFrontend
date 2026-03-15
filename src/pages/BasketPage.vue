<script setup>
import { computed } from "vue";
import { useBasketStore } from "../store/basketStore";
import { ShoppingCart, Trash2 } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import LeftArrow from "@/components/icons/LeftArrow.vue";
import { resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import {
  formatCylinderCountLabel,
  formatCylinderOptionLabel,
  formatPriceValue,
  getBasketPrice,
} from "@/lib/productOptions";

const { t, locale } = useI18n();
const basketStore = useBasketStore();
const router = useRouter();

basketStore.normalizeBasket();

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

const getItemKey = (item) => item.basket_key || `${item.id}:base`;

const totalPrice = computed(() => {
  let sum = 0;
  let hasText = false;

  basketStore.basket.forEach((p) => {
    const val = extractNumericOrText(getBasketPrice(p, locale.value));
    if (typeof val === "number") {
      sum += val;
    } else {
      hasText = true;
    }
  });

  if (hasText && sum === 0) {
    return "Narxni so’rang";
  }
  return sum;
});

const formatPrice = (price) => formatPriceValue(price);
const formatSelectedOptionLabel = (option) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return "";
  }

  const countLabel = formatCylinderCountLabel(option?.count);
  if (option?.group_key === "cylinder_volume" && countLabel) {
    return formatCylinderOptionLabel(option);
  }

  return label;
};

const removeItem = (item) => basketStore.removeFromBasket(getItemKey(item));
const goToProduct = (id) =>
  router.push({ name: "ProductDetail", params: { id } });
</script>

<template>
  <div class="basket-page max-w-6xl mx-auto py-12 px-4 mt-[30px]">
    <div class="basket-header flex my-4 items-center gap-12">
      <RouterLink class="basket-back hover:scale-105" to="/">
        <LeftArrow :size="30" />
      </RouterLink>
      <h1 class="basket-title animate-fade flex items-center gap-3 text-3xl font-bold">
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
          :key="getItemKey(item)"
          class="basket-card group flex flex-col items-center overflow-hidden rounded-2xl border bg-white transition-all duration-500 sm:flex-row sm:items-stretch"
        >
          <div
            class="basket-media flex-shrink-0 w-full h-52 sm:w-40 sm:h-40 flex items-center justify-center cursor-pointer"
            @click="goToProduct(item.id)"
          >
            <img
              :src="normalizeImages(item.images)[0]"
              class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <hr class="basket-divider h-full w-[1px] bg-gray-300" />
          <div
            class="basket-info flex flex-col justify-center flex-1 px-5 py-4 cursor-pointer"
            @click="goToProduct(item.id)"
          >
            <h2 class="basket-name font-semibold text-lg mb-1">{{ item[`name_${locale}`] }}</h2>
            <div
              v-if="item.selected_options?.length"
              class="mt-2 flex flex-wrap gap-2"
            >
              <span
                v-for="option in item.selected_options"
                :key="`${getItemKey(item)}-${option.group_key}`"
                class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {{ t(option.title_key) }}: {{ formatSelectedOptionLabel(option) }}
              </span>
            </div>
          </div>
          <div
            class="basket-controls flex items-center justify-end gap-6 px-5 py-4 border-t sm:border-t-0 sm:border-l border-gray-100"
          >
            <span class="basket-item-price min-w-[140px] text-right text-xl font-bold">
              {{
                typeof extractNumericOrText(getBasketPrice(item, locale)) === "number"
                  ? formatPrice(extractNumericOrText(getBasketPrice(item, locale)))
                  : extractNumericOrText(getBasketPrice(item, locale))
              }}
            </span>

            <button
              @click="removeItem(item)"
              class="basket-remove cursor-pointer rounded-xl p-2 transition-all duration-300"
            >
              <Trash2 class="h-5 w-5 text-slate-700" />
            </button>
          </div>
        </div>
      </transition-group>

      <div v-else class="basket-empty text-center py-28 text-gray-400 animate-fade">
        <p class="text-xl mb-4">{{ t("empty") }}</p>
        <button
          @click="router.push('/products')"
          class="basket-empty-btn rounded-xl px-6 py-3 text-white transition-all duration-300"
        >
          {{ t("seeProducts") }}
        </button>
      </div>

      <div
        class="basket-summary-grid mt-10 animate-fade"
        v-if="basketStore.basket.length"
      >
        <div class="basket-total-row flex justify-between items-center gap-6">
          <p class="basket-total text-2xl font-bold">
            {{ t("allBasket") }}: {{ formatPrice(totalPrice) }}
          </p>
        </div>

        <div class="basket-checkout-card">
          <button
            type="button"
            disabled
            class="basket-submit-btn"
          >
            {{ t("checkout") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basket-page {
  background: transparent;
}

.basket-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(20, 35, 56, 0.12);
  border-radius: 12px;
  background: #ffffff;
  color: #18304f;
  padding: 2px;
}

.basket-title {
  color: #142338;
}

.basket-card {
  border: 1px solid rgba(20, 35, 56, 0.1);
}

.basket-card:hover {
  border-color: rgba(20, 35, 56, 0.18);
}

.basket-media {
  background: #f3f5f7;
}

.basket-divider {
  background: rgba(20, 35, 56, 0.12);
}

.basket-name {
  color: #1b2d44;
}

.basket-controls {
  border-color: rgba(20, 35, 56, 0.08);
}

.basket-item-price {
  color: #142338;
}

.basket-remove {
  background: #f1f4f7;
}

.basket-remove:hover {
  background: #e8edf2;
}

.basket-empty {
  color: #6e7f9c;
}

.basket-empty-btn {
  background: #18304f;
}

.basket-empty-btn:hover {
  background: #142338;
}

.basket-total {
  color: #142338;
}

.basket-clear {
  background: #18304f;
}

.basket-clear:hover {
  background: #142338;
}

.basket-summary-grid {
  display: grid;
  gap: 1rem;
}

.basket-checkout-card {
  padding: 0;
  border: none;
  background: transparent;
  backdrop-filter: none;
}

.basket-submit-btn {
  min-height: 50px;
  width: 100%;
  border-radius: 14px;
  background: #18304f;
  color: #ffffff;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.basket-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
