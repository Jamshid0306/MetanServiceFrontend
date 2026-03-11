<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { ShoppingCart, Check } from "lucide-vue-next";
import Notification from "@/components/Notification.vue";
import DualRangeSlider from "@/components/DualSlider.vue";
import { useBasketStore } from "@/store/basketStore";
import { useFilterStore } from "@/store/filterStore";
import { useProductsStore } from "@/store/productsStore";
import { useLoaderStore } from "@/store/loaderStore";
import { resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import {
  buildConfiguredBasketItem,
  formatPriceValue,
  getDefaultOptionSelections,
} from "@/lib/productOptions";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const basketStore = useBasketStore();
const filterStore = useFilterStore();
const productsStore = useProductsStore();
const loaderStore = useLoaderStore();

const minValue = ref(0);
const maxValue = ref(0);
const initialMin = ref(0);
const initialMax = ref(0);

const animating = ref({});
const showCheck = ref({});
const notification = ref({ show: false, message: "" });

const currentPage = ref(1);
const itemsPerPage = 9;

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

const maxPrice = computed(() => {
  const prices = filterStore.products
    .map((p) => parsePrice(p[`price_${locale.value}`]))
    .filter((p) => p !== null);
  return prices.length ? Math.max(...prices) : 0;
});

const syncPriceBounds = () => {
  const prices = filterStore.products
    .map((p) => parsePrice(p[`price_${locale.value}`]))
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
  currentPage.value = 1;
};

const handleClick = (product) => {
  const id = product.id;
  if (animating.value[id]) return;

  animating.value[id] = true;
  setTimeout(() => (showCheck.value[id] = true), 600);
  setTimeout(() => {
    showCheck.value[id] = false;
    animating.value[id] = false;
  }, 1800);

  basketStore.addToBasket(
    buildConfiguredBasketItem(product, getDefaultOptionSelections(product))
  );
  notification.value = {
    show: true,
    message: `${product[`name_${locale.value}`]} ${t("add_to_cart2")}`,
  };
};

const filteredProducts = computed(() => {
  const withPrice = [];
  const withoutPrice = [];

  for (const p of filterStore.products) {
    const numericPrice = parsePrice(p[`price_${locale.value}`]);
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

  return [...priceFiltered, ...withoutPrice];
});

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredProducts.value.slice(start, start + itemsPerPage);
});

const totalPages = computed(() => {
  const pages = Math.ceil(filteredProducts.value.length / itemsPerPage);
  return pages > 0 ? pages : 1;
});

const goToDetail = (id) => {
  loaderStore.loader = true;
  productsStore.fetchProductDetail(id);
  router.push({ name: "ProductDetail", params: { id } });
};

const formatPrice = (price) => formatPriceValue(price);
const actionLabel = () => t("add_to_cart");

watch(locale, () => {
  syncPriceBounds();
});

watch(currentPage, (val) => {
  router.replace({
    query: {
      ...route.query,
      page: val,
    },
  });
});

onMounted(async () => {
  loaderStore.loader = true;
  await fetchProducts();
  loaderStore.loader = false;

  if (route.query.page) {
    currentPage.value = Number(route.query.page);
  }
});
</script>

<template>
  <div class="products-page min-h-screen py-4 mt-[80px] max-sm:mt-[66px]">
    <div class="container mx-auto px-4 flex flex-col lg:flex-row gap-8">
      <aside class="w-full lg:w-72">
        <div class="filter-panel p-6 lg:sticky lg:top-10 space-y-6 max-lg:space-y-3">
          <div class="flex items-center justify-between pb-4 border-b border-slate-200">
            <h2 class="font-bold text-xl text-slate-800 max-sm:text-[18px]">{{ t("filters") }}</h2>
            <button
              v-if="isAnyFilterActive"
              @click="clearFilters"
              class="text-sm text-blue-700 hover:text-blue-900 font-semibold transition-colors"
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
          class="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 md:gap-6"
        >
          <div
            v-for="product in paginatedProducts"
            :key="product.id"
            class="catalog-card group"
          >
            <div @click="goToDetail(product.id)" class="cursor-pointer group">
              <div class="catalog-meta">
                <span class="catalog-id">#{{ product.id }}</span>
              </div>
              <div class="catalog-media">
                <img
                  :src="normalizeImages(product.images)[0]"
                  :alt="product.name"
                  class="catalog-image"
                />
              </div>
              <h3
                class="catalog-title"
              >
                {{ product[`name_${locale}`] }}
              </h3>
            </div>

            <div class="catalog-footer">
              <p class="catalog-price">
                {{ formatPrice(product[`price_${locale}`]) }}
              </p>
              <button
                @click="handleClick(product)"
                class="catalog-btn relative w-full flex items-center justify-center gap-1 sm:gap-2 text-white py-2 rounded-xl font-medium overflow-hidden transition-colors duration-300 cart-btn text-[13px] sm:text-sm md:text-base"
              >
                <span
                  class="transition-all duration-300 max-sm:text-[10px]"
                  :class="animating[product.id] ? 'opacity-0 scale-0' : 'opacity-100 scale-100'"
                >
                  {{ actionLabel(product) }}
                </span>
                <ShoppingCart
                  class="catalog-cart-icon absolute w-4 h-4 sm:w-5 sm:h-5 transition-all duration-500"
                  :class="animating[product.id] ? 'translate-x-28 opacity-0' : 'translate-x-0 opacity-100'"
                />
                <Check
                  class="absolute w-5 h-5 sm:w-6 sm:h-6 text-white transition-all duration-500"
                  :class="showCheck[product.id] ? 'opacity-100 scale-100' : 'opacity-0 scale-0'"
                />
              </button>
            </div>
          </div>
        </transition-group>
      </main>
    </div>

    <div v-if="totalPages > 1" class="flex justify-center items-center mt-10 gap-2 flex-wrap">
      <button
        @click="currentPage > 1 && currentPage--"
        :disabled="currentPage === 1"
        class="w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-blue-700 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ‹
      </button>

      <button
        v-for="page in totalPages"
        :key="page"
        @click="currentPage = page"
        class="w-9 h-9 flex items-center justify-center rounded-full font-medium transition-all"
        :class="
          currentPage === page
            ? 'bg-blue-700 text-white shadow-md scale-105 border border-blue-700'
            : 'border border-slate-300 text-slate-700 hover:bg-blue-100'
        "
      >
        {{ page }}
      </button>

      <button
        @click="currentPage < totalPages && currentPage++"
        :disabled="currentPage === totalPages"
        class="w-9 h-9 flex items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-blue-700 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ›
      </button>
    </div>

    <Notification
      v-if="notification.show"
      :message="notification.message"
      :show="notification.show"
      @close="notification.show = false"
    />
  </div>
</template>

<style scoped>
.products-page {
  background:
    radial-gradient(circle at top right, rgba(24, 79, 149, 0.09), transparent 42%),
    radial-gradient(circle at bottom left, rgba(15, 43, 102, 0.06), transparent 40%),
    #f8fbff;
}

.filter-panel {
  background: #ffffff;
  border: 1px solid #dfe8f6;
  border-radius: 14px;
  box-shadow: 0 10px 20px rgba(8, 30, 72, 0.08);
}

.catalog-card {
  border-radius: 16px;
  border: 1px solid rgba(20, 54, 108, 0.14);
  background: #ffffff;
  box-shadow: 0 12px 22px rgba(8, 30, 72, 0.07);
  padding: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.catalog-card:hover {
  transform: translateY(-4px);
  border-color: rgba(20, 54, 108, 0.25);
  box-shadow: 0 18px 28px rgba(8, 30, 72, 0.13);
}

.catalog-meta {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 6px;
}

.catalog-id {
  border-radius: 999px;
  background: rgba(20, 62, 122, 0.1);
  color: #194887;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 800;
}

.catalog-media {
  min-height: 126px;
  border-radius: 12px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: linear-gradient(180deg, #fbfdff, #f3f7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 10px;
}

.catalog-image {
  width: 100%;
  max-width: 128px;
  height: 100%;
  max-height: 128px;
  object-fit: contain;
  transition: transform 0.45s ease;
}

.catalog-card:hover .catalog-image {
  transform: translateY(-3px) scale(1.06);
}

.catalog-title {
  margin-top: 10px;
  text-align: left;
  color: #1a3968;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.4;
  min-height: 40px;
}

.catalog-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(20, 54, 108, 0.16);
}

.catalog-price {
  color: #12325f;
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 10px;
  text-align: left;
}

.cart-btn {
  background: #143d7a;
  border: 1px solid rgba(20, 54, 108, 0.14);
  box-shadow: 0 10px 16px rgba(8, 33, 76, 0.2);
}

.catalog-btn {
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.catalog-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 20px rgba(8, 33, 76, 0.25);
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
