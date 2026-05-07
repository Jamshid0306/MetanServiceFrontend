<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { ArrowRight } from "lucide-vue-next";
import DualRangeSlider from "@/components/DualSlider.vue";
import { useFilterStore } from "@/store/filterStore";
import { useProductsStore } from "@/store/productsStore";
import { useLoaderStore } from "@/store/loaderStore";
import { useCreditTariffsStore } from "@/store/creditTariffsStore";
import { resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import { formatPriceValue, getProductDefaultPrice, getInstallmentPlan } from "@/lib/productOptions";
import { matchesProductSearch, scoreProductSearch } from "@/lib/productSearch";

const router = useRouter();
const { t, locale } = useI18n();
const filterStore = useFilterStore();
const productsStore = useProductsStore();
const loaderStore = useLoaderStore();
const creditTariffsStore = useCreditTariffsStore();

const minValue = ref(0);
const maxValue = ref(0);
const initialMin = ref(0);
const initialMax = ref(0);

const isFilterModalOpen = ref(false);
const searchQuery = ref("");
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
const getProductDisplayName = (product) =>
  product?.[`short_name_${locale.value}`] ||
  product?.[`name_${locale.value}`] ||
  product?.name_ru ||
  product?.name_uz ||
  "";

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
  return (
    minValue.value !== initialMin.value ||
    maxValue.value !== initialMax.value ||
    searchQuery.value.trim().length > 0
  );
});

const clearFilters = () => {
  minValue.value = initialMin.value;
  maxValue.value = initialMax.value;
  searchQuery.value = "";

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

  const query = searchQuery.value.trim();
  const searchedResult = query
    ? result.filter((product) => matchesProductSearch(product, query))
    : result;

  // With search: relevance first. Without search: admin order first.
  searchedResult.sort((a, b) => {
    if (query) {
      return (
        scoreProductSearch(b, query, locale.value) -
          scoreProductSearch(a, query, locale.value) ||
        getProductOrder(a) - getProductOrder(b) ||
        Number(a?.id ?? 0) - Number(b?.id ?? 0)
      );
    }

    return (
      getProductOrder(a) - getProductOrder(b) ||
      Number(a?.id ?? 0) - Number(b?.id ?? 0)
    );
  });

  return searchedResult;
});

const goToDetail = (id, options = {}) => {
  loaderStore.loader = true;
  productsStore.fetchProductDetail(id);
  router.push({
    name: "ProductDetail",
    params: { id },
    query: options.openImage ? { image: "0" } : {},
  });
};

const formatPrice = (price) => formatPriceValue(price);
const INSTALLMENT_MONTHS = 12;
const getProductInstallment = (product) =>
  getInstallmentPlan(
    product,
    locale.value,
    INSTALLMENT_MONTHS,
    creditTariffsStore.tariffs
  );
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
  await Promise.all([fetchProducts(), creditTariffsStore.fetchTariffs()]);
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
        <div class="catalog-search-shell">
          <div class="catalog-search-wrap">
            <svg
              class="catalog-search-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t('nav.search_products') + '...'"
              class="catalog-search-input"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="catalog-search-clear"
              @click="searchQuery = ''"
            >
              ×
            </button>
          </div>
        </div>

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
            <div
              @click="goToDetail(product.id)"
              class="catalog-main cursor-pointer group"
            >
              <div class="catalog-media">
                <img
                  v-if="normalizeImages(product.images)[0]"
                  :src="normalizeImages(product.images)[0]"
                  :alt="product[`name_${locale}`]"
                  class="catalog-image"
                />
              </div>
              <div class="catalog-copy">
                <div class="catalog-meta">
                  <span class="catalog-id">#{{ product.id }}</span>
                </div>
                <h3 class="catalog-title">
                  {{ getProductDisplayName(product) }}
                </h3>
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
                </div>
              </div>
            </div>

            <button
              @click="handleClick(product)"
              class="catalog-btn"
              :aria-label="`${actionLabel()} ${product[`name_${locale}`]}`"
            >
              <span class="catalog-btn-text">
                {{ actionLabel() }}
              </span>
              <ArrowRight class="catalog-cart-icon" />
            </button>
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

.catalog-search-shell {
  margin-bottom: 1rem;
}

.catalog-search-wrap {
  position: relative;
}

.catalog-search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  width: 1.05rem;
  height: 1.05rem;
  transform: translateY(-50%);
  color: #64748b;
}

.catalog-search-input {
  width: 100%;
  min-height: 52px;
  border-radius: 18px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.96);
  color: #18304f;
  padding: 0.95rem 3rem 0.95rem 2.9rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.catalog-search-input:focus {
  border-color: rgba(24, 48, 79, 0.2);
  box-shadow: 0 0 0 4px rgba(24, 48, 79, 0.08);
  background: #ffffff;
}

.catalog-search-clear {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: none;
  background: #eef2f6;
  color: #42546d;
  font-size: 1.15rem;
  line-height: 1;
}

.catalog-card {
  border-radius: 20px;
  border: none;
  background: #ffffff;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  overflow: visible;
  transition: transform 0.3s ease;
}

.catalog-card:hover {
  transform: translateY(-2px);
}

.catalog-main {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
  flex: 1 1 auto;
}

.catalog-copy {
  min-width: 0;
  flex: 1 1 auto;
  padding: 10px 0;
}

.catalog-meta {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 0.35rem;
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
  flex: 0 0 156px;
  width: 156px;
  margin: 8px 0 8px 8px;
  aspect-ratio: 1 / 1;
  border: none;
  border-radius: 6px;
  background: #f3f5f7;
  overflow: hidden;
}

.catalog-image {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 6px;
  object-fit: cover;
  transition: transform 0.45s ease;
}

.catalog-card:hover .catalog-image {
  transform: translateY(-3px) scale(1.06);
}

.catalog-title {
  margin-top: 0;
  text-align: left;
  color: #1b2d44;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.3;
  min-height: unset;
  word-break: break-word;
}

.catalog-footer {
  margin-top: 0.4rem;
  padding-top: 0;
  border-top: none;
}

.catalog-price {
  color: #6a7687;
  font-size: 0.94rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
  text-align: left;
}

.catalog-installment {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0;
  margin-bottom: 0;
  background: transparent;
  color: #18304f;
  font-size: 0.72rem;
  font-weight: 700;
}

.catalog-btn {
  flex: 0 0 auto;
  min-width: 132px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 14px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #18304f;
  color: #ffffff;
  margin-right: 12px;
  padding: 0 0.95rem;
  transition: transform 0.25s ease;
}

.catalog-btn:hover {
  transform: translateY(-1px);
  background: #142338;
}

.catalog-cart-icon {
  width: 22px;
  height: 22px;
}

.catalog-btn-text {
  display: inline;
  font-size: 0.88rem;
  font-weight: 700;
}

@media (max-width: 640px) {
  .products-page {
    padding-top: 0.25rem;
  }

  .catalog-card {
    padding: 0;
    border-radius: 0;
    gap: 0.6rem;
  }

  .catalog-main {
    gap: 0.65rem;
  }

  .catalog-meta {
    display: none;
  }

  .catalog-media {
    width: 112px;
    flex-basis: 112px;
    margin: 6px 0 6px 6px;
    border-radius: 6px;
    background: #f7f7f7;
  }

  .catalog-copy {
    padding: 8px 0;
  }

  .catalog-title {
    font-size: 0.9rem;
    min-height: 0;
  }

  .catalog-price {
    font-size: 0.78rem;
    margin-bottom: 0.1rem;
  }

  .catalog-installment {
    display: inline-flex;
    font-size: 0.66rem;
    white-space: nowrap;
  }

  .catalog-footer {
    margin-top: 0.2rem;
  }

  .catalog-btn {
    margin-left: auto;
    margin-right: 10px;
    align-self: center;
    width: 30px;
    min-width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    color: #18304f;
    padding: 0;
  }

  .catalog-btn-text {
    display: none;
  }

  .catalog-cart-icon {
    width: 24px;
    height: 24px;
    color: currentColor;
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
