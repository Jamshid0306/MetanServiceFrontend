<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ArrowRight } from "lucide-vue-next";
import DualRangeSlider from "@/components/DualSlider.vue";
import { useFilterStore } from "@/store/filterStore";
import { useProductsStore } from "@/store/productsStore";
import { useLoaderStore } from "@/store/loaderStore";
import { resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import { formatPriceValue, getProductDefaultPrice, getInstallmentPlan } from "@/lib/productOptions";

const router = useRouter();
const { t, locale } = useI18n();
const filterStore = useFilterStore();
const productsStore = useProductsStore();
const loaderStore = useLoaderStore();

const minValue = ref(0);
const maxValue = ref(0);
const initialMin = ref(0);
const initialMax = ref(0);

const isFilterModalOpen = ref(false);
let filterModalAutoCloseTimer = null;

const normalizeImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) {
    return resolveAssetUrls(images);
  }
  if (typeof images === "string") {
    const resolved = resolveAssetUrl(images);
    return resolved ? [resolved] : [];
  }
  return [];
};

const parsePrice = (rawPrice) => {
  if (!rawPrice) return null;
  const cleaned = rawPrice.toString().replace(/[^\d]/g, "");
  if (!cleaned) return null;
  const numeric = Number(cleaned);
  return Number.isNaN(numeric) ? null : numeric;
};

const getProductOrder = (product) => {
  const raw =
    product?.order ??
    product?.display_order ??
    product?.sort_order ??
    product?.position ??
    0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 999999;
};

const getProductDisplayPrice = (product) =>
  getProductDefaultPrice(product, locale.value);

const maxPrice = computed(() => {
  const prices = filterStore.products
    .map((p) => parsePrice(getProductDisplayPrice(p)))
    .filter((p) => p !== null);
  return prices.length ? Math.max(...prices) : 0;
});

const syncPriceBounds = () => {
  const prices = filterStore.products
    .map((p) => parsePrice(getProductDisplayPrice(p)))
    .filter((p) => p !== null);

  if (!prices.length) {
    initialMin.value = 0;
    initialMax.value = 0;
    minValue.value = 0;
    maxValue.value = 0;
    return;
  }

  initialMin.value = Math.min(...prices);
  initialMax.value = Math.max(...prices);

  if (minValue.value < initialMin.value || minValue.value === 0) {
    minValue.value = initialMin.value;
  }
  if (maxValue.value > initialMax.value || maxValue.value === 0) {
    maxValue.value = initialMax.value;
  }
};

const fetchProducts = async () => {
  await filterStore.fetchProducts();
  syncPriceBounds();
};

const isAnyFilterActive = computed(() => {
  return minValue.value !== initialMin.value || maxValue.value !== initialMax.value;
});

const clearFilters = () => {
  minValue.value = initialMin.value;
  maxValue.value = initialMax.value;

  // Close modal on mobile after resetting filters.
  if (isFilterModalOpen.value) closeFilterModal();
};

const openFilterModal = () => {
  isFilterModalOpen.value = true;
};

const closeFilterModal = () => {
  isFilterModalOpen.value = false;
};

const handleClick = (product) => {
  // Catalogdagi tugma bosilganda: faqat detailga kirish.
  goToDetail(product.id);
};

const filteredProducts = computed(() => {
  const withPrice = [];
  const withoutPrice = [];

  for (const p of filterStore.products) {
    const numericPrice = parsePrice(getProductDisplayPrice(p));
    if (numericPrice === null) {
      withoutPrice.push(p);
      continue;
    }
    withPrice.push({ ...p, numericPrice });
  }

  withPrice.sort((a, b) => a.numericPrice - b.numericPrice);

  const priceFiltered = withPrice.filter(
    (p) => p.numericPrice >= minValue.value && p.numericPrice <= maxValue.value
  );

  const result = [...priceFiltered, ...withoutPrice];

  // Sort by admin-defined order; same order -> sequential by id.
  result.sort(
    (a, b) =>
      getProductOrder(a) - getProductOrder(b) ||
      Number(a?.id ?? 0) - Number(b?.id ?? 0)
  );

  return result;
});

const goToDetail = (id) => {
  loaderStore.loader = true;
  productsStore.fetchProductDetail(id);
  router.push({ name: "ProductDetail", params: { id } });
};

const formatPrice = (price) => formatPriceValue(price);
const INSTALLMENT_MONTHS = 12;
const getProductInstallment = (product) =>
  getInstallmentPlan(product, locale.value, INSTALLMENT_MONTHS);
const formatInstallmentLabel = (product) => {
  const installment = getProductInstallment(product);
  if (!installment) {
    return "";
  }

  return `${formatPrice(installment.monthlyPayment)} / ${installment.months} ${t("credit.months")}`;
};
const actionLabel = () => t("header.more");

watch(locale, () => {
  syncPriceBounds();
});

watch(isFilterModalOpen, (open, _prev, onInvalidate) => {
  if (!open) return;

  const onKeyDown = (e) => {
    if (e.key === "Escape") closeFilterModal();
  };

  // Prevent background scrolling while modal is open.
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", onKeyDown);

  onInvalidate(() => {
    document.body.style.overflow = "";
    window.removeEventListener("keydown", onKeyDown);
  });
});

watch([minValue, maxValue], () => {
  if (!isFilterModalOpen.value) return;

  // Auto-close after user finishes adjusting (debounced).
  if (filterModalAutoCloseTimer) window.clearTimeout(filterModalAutoCloseTimer);
  filterModalAutoCloseTimer = window.setTimeout(() => {
    closeFilterModal();
  }, 450);
});

onMounted(async () => {
  loaderStore.loader = true;
  await fetchProducts();
  loaderStore.loader = false;
});
</script>

<template>
  <div class="products-page min-h-screen py-4 mt-[80px] max-sm:mt-[66px]">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row gap-8 relative">
      <aside class="hidden lg:block w-full lg:w-72">
        <div class="filter-panel p-6 lg:sticky lg:top-10 space-y-6 max-lg:space-y-3">
          <div class="flex items-center justify-between pb-4 border-b border-slate-200">
            <h2 class="font-bold text-xl text-slate-800 max-sm:text-[18px]">{{ t("filters") }}</h2>
            <button
              v-if="isAnyFilterActive"
              @click="clearFilters"
              class="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
            >
              {{ t("clear") }}
            </button>
          </div>

          <div>
            <h3 class="font-semibold mb-3 text-slate-700 max-sm:mb-2">{{ t("price") }}</h3>
            <DualRangeSlider
              :min="initialMin"
              :max="maxPrice"
              :step="1000"
              v-model:minValue="minValue"
              v-model:maxValue="maxValue"
            />
          </div>
        </div>
      </aside>

      <main class="flex-1">
        <transition-group
          tag="div"
          name="fade-slide"
          class="flex flex-col gap-3 sm:gap-4"
        >
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="catalog-card group"
          >
            <div @click="goToDetail(product.id)" class="cursor-pointer group">
              <div class="catalog-meta">
                <span class="catalog-id">#{{ product.id }}</span>
              </div>
              <h3
                class="catalog-title"
              >
                {{ product[`name_${locale}`] }}
              </h3>
            </div>

            <div class="catalog-footer">
              <p class="catalog-price">
                {{ formatPrice(getProductDisplayPrice(product)) }}
              </p>
              <p
                v-if="getProductInstallment(product)"
                class="catalog-installment"
              >
                {{ formatInstallmentLabel(product) }}
              </p>
              <button
                @click="handleClick(product)"
                class="catalog-btn relative w-full flex items-center justify-center gap-1 sm:gap-2 text-white py-2 rounded-xl font-medium overflow-hidden transition-colors duration-300 cart-btn text-[13px] sm:text-sm md:text-base"
              >
                <span class="transition-all duration-300 max-sm:text-[10px]">
                  {{ actionLabel() }}
                </span>
                <ArrowRight
                  class="catalog-cart-icon absolute w-4 h-4 sm:w-5 sm:h-5 transition-all duration-500"
                />
              </button>
            </div>
          </div>
        </transition-group>
      </main>
    </div>

    <!-- Mobile filter button + modal -->
    <button
      type="button"
      class="lg:hidden fixed right-4 bottom-24 z-60 h-12 px-4 rounded-2xl bg-slate-900 text-white shadow-lg flex items-center gap-2 transition-transform hover:scale-[1.03]"
      v-if="!isFilterModalOpen"
      :aria-label="t('filters')"
      @click="openFilterModal"
    >
      <!-- settings / sliders icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M4 21v-7" />
        <path d="M4 10V3" />
        <path d="M12 21v-9" />
        <path d="M12 8V3" />
        <path d="M20 21v-5" />
        <path d="M20 11V3" />
        <path d="M1 14h6" />
        <path d="M9 8h6" />
        <path d="M17 16h6" />
      </svg>
      <span class="text-sm font-semibold">{{ t("filters") }}</span>
    </button>

    <div
      v-if="isFilterModalOpen"
      class="fixed inset-0 z-60 bg-slate-900/50 flex items-center justify-center p-3"
      @click.self="closeFilterModal"
    >
      <div
        class="w-full max-w-md mx-auto filter-panel p-6 space-y-6 max-h-[82vh] overflow-auto rounded-2xl"
      >
        <div class="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2 class="font-bold text-xl text-slate-800 max-sm:text-[18px]">{{ t("filters") }}</h2>
          <div class="flex items-center gap-2">
            <button
              v-if="isAnyFilterActive"
              @click="clearFilters"
              class="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-950"
            >
              {{ t("clear") }}
            </button>
            <button
              type="button"
              class="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
              aria-label="Close"
              @click="closeFilterModal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <h3 class="font-semibold mb-3 text-slate-700 max-sm:mb-2">{{ t("price") }}</h3>
          <DualRangeSlider
            :min="initialMin"
            :max="maxPrice"
            :step="1000"
            v-model:minValue="minValue"
            v-model:maxValue="maxValue"
          />
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.products-page {
  background: transparent;
}

.filter-panel {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(20, 35, 56, 0.1);
  border-radius: 18px;
  backdrop-filter: blur(8px);
}

.catalog-card {
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #ffffff;
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease;
}

.catalog-card:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 35, 56, 0.18);
}

.catalog-meta {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 6px;
}

.catalog-id {
  border-radius: 999px;
  background: rgba(20, 35, 56, 0.06);
  color: #41536f;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 800;
}

.catalog-media {
  min-height: 170px;
  height: 170px;
  border-radius: 16px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #f3f5f7;
  overflow: hidden;
}

.catalog-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.45s ease;
}

.catalog-card:hover .catalog-image {
  transform: translateY(-3px) scale(1.06);
}

.catalog-title {
  margin-top: 10px;
  text-align: left;
  color: #1b2d44;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
  min-height: unset;
}

.catalog-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(20, 35, 56, 0.08);
}

.catalog-price {
  color: #142338;
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 0.45rem;
  text-align: left;
}

.catalog-installment {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.28rem 0.6rem;
  margin-bottom: 0.85rem;
  background: rgba(24, 48, 79, 0.08);
  color: #18304f;
  font-size: 0.75rem;
  font-weight: 700;
}

.cart-btn {
  background: #18304f;
  border: 1px solid rgba(20, 35, 56, 0.06);
}

.catalog-btn {
  transition: transform 0.25s ease;
}

.catalog-btn:hover {
  transform: translateY(-1px);
  background: #142338;
}

.catalog-cart-icon {
  left: 12px;
}

@media (max-width: 640px) {
  .catalog-title {
    font-size: 0.8rem;
    min-height: 38px;
  }

  .catalog-price {
    font-size: 0.88rem;
  }

  .catalog-installment {
    font-size: 0.68rem;
    padding: 0.24rem 0.5rem;
  }

  .catalog-cart-icon {
    left: 8px;
  }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
</style>
