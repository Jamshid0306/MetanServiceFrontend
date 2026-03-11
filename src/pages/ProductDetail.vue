<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useProductsStore } from "../store/productsStore";
import { useBasketStore } from "../store/basketStore";
import { ShoppingCart, Check, Plus, Minus } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { Swiper, SwiperSlide } from "swiper/vue";
import { useRoute, useRouter } from "vue-router";
import "swiper/css";
import LeftArrow from "@/components/icons/LeftArrow.vue";
import { useLoaderStore } from "@/store/loaderStore";
import Notification from "@/components/Notification.vue";
import { resolveAssetUrls } from "@/lib/api";
import {
  calculateCreditPlan,
  buildConfiguredBasketItem,
  calculateConfiguredPrice,
  ensureValidOptionSelections,
  formatPriceValue,
  getDefaultOptionSelections,
  getCreditConfig,
  getProductOptionGroups,
  hasCreditPricing,
} from "@/lib/productOptions";

const router = useRouter();
const store = useProductsStore();
const basketStore = useBasketStore();
const { t, locale } = useI18n();
const route = useRoute();
const detailAnimating = ref(false);
const detailShowCheck = ref(false);
const animating = ref({});
const showCheck = ref({});
const quantity = ref(1);
const activeTab = ref("description");
const relatedProductRefs = ref([]);
const swiperRef = ref(null);
const notification = ref({ show: false, message: "" });
const selectedOptions = ref({});
let swiperInstance = null;

const goToSlide = (index) => {
  if (swiperInstance) {
    swiperInstance.slideTo(index);
  }
};

const handleAddToBasket = () => {
  if (detailAnimating.value) return;
  basketStore.addToBasket(
    buildConfiguredBasketItem(
      store.product,
      selectedOptions.value,
      Number(quantity.value) || 1
    )
  );
  notification.value = {
    show: true,
    message: `${store.product[`name_${locale.value}`]} ${t("add_to_cart2")}`,
  };
  detailAnimating.value = true;
  setTimeout(() => (detailShowCheck.value = true), 400);
  setTimeout(() => {
    detailShowCheck.value = false;
    detailAnimating.value = false;
    quantity.value = 1;
  }, 1600);
};

const normalizeImages = (images) => resolveAssetUrls(images);

const images = computed(() => normalizeImages(store.product?.images || []));
const optionGroups = computed(() =>
  getProductOptionGroups(store.product, selectedOptions.value)
);
const selectedPrice = computed(() =>
  calculateConfiguredPrice(store.product, locale.value, selectedOptions.value)
);
const creditConfig = computed(() => getCreditConfig(store.product));
const selectedCreditPlan = computed(() => {
  if (!hasCreditPricing(store.product) || !creditConfig.value) {
    return null;
  }

  return calculateCreditPlan(
    selectedPrice.value,
    creditConfig.value.percent,
    creditConfig.value.months
  );
});

const relatedProducts = computed(() => {
  const list = Array.isArray(store.products) ? store.products : [];
  return list.filter((p) => p.id !== store.product?.id).slice(0, 4);
});

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      await fetchProductData(Number(newId));
    }
  }
);

onMounted(async () => {
  await fetchProductData(Number(route.params.id));
});

const syncSelectedOptions = () => {
  selectedOptions.value = ensureValidOptionSelections(store.product, selectedOptions.value);
};

const fetchProductData = async (id) => {
  const productExists = await store.fetchProductDetail(id);
  if (!productExists) {
    router.replace({ name: "NotFound" });
    return;
  }

  if (!store.products.length) {
    await store.fetchProducts(200, 0);
  }

  syncSelectedOptions();
  quantity.value = 1;
  activeTab.value = "description";

  await nextTick();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-show");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  relatedProductRefs.value.forEach((el) => {
    if (el) observer.observe(el);
  });
};
const formatPrice = (price) => formatPriceValue(price);
const selectOption = (groupKey, optionId) => {
  selectedOptions.value = ensureValidOptionSelections(store.product, {
    ...selectedOptions.value,
    [groupKey]: optionId,
  });
};
const goToDetail = (id) => {
  useLoaderStore().loader = true;
  router.push({ name: "ProductDetail", params: { id } });
};
onMounted(() => {
  if (swiperRef.value && swiperRef.value.swiper) {
    swiperInstance = swiperRef.value.swiper;
  }
});

const handleClick = (product) => {
  const id = product.id;
  if (animating.value[id]) return;
  animating.value = { ...animating.value, [id]: true };
  setTimeout(() => (showCheck.value = { ...showCheck.value, [id]: true }), 400);
  setTimeout(() => {
    showCheck.value = { ...showCheck.value, [id]: false };
    animating.value = { ...animating.value, [id]: false };
  }, 1600);
  basketStore.addToBasket(
    buildConfiguredBasketItem(product, getDefaultOptionSelections(product))
  );
};

const relatedActionLabel = () => t("add_to_cart");
</script>

<template>
  <div class="detail-page container mx-auto mt-[100px] px-6">
    <div
      class="detail-topbar mb-[20px] flex justify-center items-center relative animate-fade-in-down"
    >
      <button
        @click="$router.back()"
        class="detail-back cursor-pointer absolute left-[10px] hover:scale-105"
      >
        <LeftArrow :size="40" />
      </button>

      <h2 class="detail-page-title text-2xl sm:text-3xl font-bold text-center text-blue-900">
        {{ t("product.about") }}
      </h2>
    </div>
    <div class="detail-main flex flex-col lg:flex-row gap-12 pb-[20px] animate-slide-in-up">
      <div class="detail-gallery lg:w-1/2 flex justify-center items-center flex-col gap-4">
        <Swiper
          ref="swiperRef"
          class="detail-swiper rounded-2xl w-full h-[450px] border border-gray-100 shadow-md bg-white"
          space-between="10"
          slides-per-view="1"
          :onSwiper="(swiper) => (swiperInstance = swiper)"
        >
          <SwiperSlide v-for="(img, index) in images" :key="index">
            <img
              :src="img"
              alt="Product"
              class="detail-slide-image w-full h-[450px] object-contain rounded-2xl transition-transform duration-500 hover:scale-105"
            />
          </SwiperSlide>
        </Swiper>
        <div class="detail-thumbs flex gap-2 overflow-x-auto mt-2">
          <img
            v-for="(img, index) in images"
            :key="index"
            :src="img"
            class="detail-thumb w-24 h-24 object-cover rounded-xl border cursor-pointer transition-transform duration-300 hover:scale-110 hover:shadow-md"
            @click="goToSlide(index)"
          />
        </div>
      </div>

      <div class="detail-info lg:w-1/2 flex flex-col gap-[20px] justify-center">
        <div class="detail-summary">
          <h1
            class="detail-name text-4xl font-bold text-gray-900 tracking-tight leading-snug"
          >
            {{ store.product[`name_${locale}`] }}
          </h1>

          <div class="detail-price-box">
            <span
              v-if="optionGroups.length"
              class="detail-price-label text-sm font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              {{ t("productOptions.totalPrice") }}
            </span>
            <span class="detail-price text-3xl font-semibold text-blue-800">
              {{ formatPrice(selectedPrice) }}
            </span>
          </div>
        </div>

        <div class="detail-actions">
          <div
            v-if="optionGroups.length"
            class="detail-options grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
          >
            <div class="detail-options-head">
              <p class="detail-options-kicker">
                {{ t("productOptions.selectionHelp") }}
              </p>
            </div>
            <div
              v-for="group in optionGroups"
              :key="group.key"
              class="detail-option-group"
            >
              <div class="detail-option-headline">
                <h3 class="text-sm font-semibold text-slate-700">
                  {{ t(group.titleKey) }}
                </h3>
              </div>
              <div class="detail-option-grid flex flex-wrap gap-2">
                <button
                  v-for="option in group.options"
                  :key="option.id"
                  type="button"
                  @click="selectOption(group.key, option.id)"
                  class="detail-option"
                  :class="
                    selectedOptions[group.key] === option.id
                      ? 'detail-option-active'
                      : ''
                  "
                >
                  <span>{{ option.label }}</span>
                  <span
                    v-if="group.key === 'cylinder_volume'"
                    class="text-xs font-medium text-slate-500"
                  >
                    {{
                      option.price_delta
                        ? `+${formatPrice(option.price_delta)}`
                        : t("productOptions.included")
                    }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="selectedCreditPlan && creditConfig"
            class="credit-card"
          >
            <div class="credit-card-head">
              <div>
                <p class="credit-kicker">{{ t("credit.title") }}</p>
                <h3 class="credit-heading">{{ t("credit.subtitle") }}</h3>
              </div>
              <div class="credit-pill-group">
                <div class="credit-rate-pill">
                  {{ creditConfig.percent }}%
                </div>
                <div class="credit-rate-pill">
                  {{ creditConfig.months }} {{ t("credit.months") }}
                </div>
              </div>
            </div>

            <div v-if="selectedCreditPlan" class="credit-summary">
              <div class="credit-metric">
                <span class="credit-metric-label">{{ t("credit.total") }}</span>
                <strong class="credit-metric-value">
                  {{ formatPrice(selectedCreditPlan.total) }}
                </strong>
              </div>
              <div class="credit-metric">
                <span class="credit-metric-label">{{ t("credit.monthlyPayment") }}</span>
                <strong class="credit-metric-value">
                  {{ formatPrice(selectedCreditPlan.monthlyPayment) }}
                </strong>
              </div>
              <div class="credit-note">
                +{{ selectedCreditPlan.appliedPercent }}% {{ t("credit.appliedRate") }}
              </div>
            </div>
          </div>

          <!-- Quantity -->
          <div
            class="qty-box flex items-center border w-[160px] rounded-2xl overflow-hidden shadow-md bg-white"
          >
            <button
              @click="Number(quantity) > 1 ? (quantity = Number(quantity) - 1) : null"
              class="qty-btn w-12 h-12 flex items-center justify-center bg-blue-50 cursor-pointer hover:bg-blue-200 transition-all duration-300"
            >
              <Minus class="w-5 h-5 text-blue-700" />
            </button>

            <input
              type="text"
              v-model="quantity"
              class="qty-input w-16 text-center font-semibold text-xl text-gray-800 outline-none select-none focus:ring-2 focus:ring-blue-400"
              @input="quantity = String(quantity).replace(/[^0-9]/g, '')"
              @blur="if (!quantity || parseInt(quantity) < 1) quantity = 1;"
            />

            <button
              @click="quantity = Number(quantity || 0) + 1"
              class="qty-btn w-12 h-12 flex items-center justify-center bg-blue-50 cursor-pointer hover:bg-blue-200 transition-all duration-300"
            >
              <Plus class="w-5 h-5 text-blue-700" />
            </button>
          </div>

          <!-- Add to cart -->
          <button
            @click="handleAddToBasket"
            class="detail-add-btn relative cursor-pointer w-[70%] flex-1 flex items-center justify-center gap-2 bg-[#1a4f95] text-white py-4 rounded-2xl font-medium overflow-hidden shadow-lg hover:bg-blue-800 active:scale-95 transition-all duration-300"
          >
            <span
              :class="
                detailAnimating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
              "
              class="transition-all duration-300"
            >
              {{ $t("add_to_cart") }}
            </span>
            <ShoppingCart
              :class="
                detailAnimating
                  ? 'translate-x-44 opacity-0'
                  : 'translate-x-0 opacity-100'
              "
              class="absolute w-5 h-5 left-5 transition-all duration-500"
            />
            <Check
              :class="
                detailShowCheck ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              "
              class="absolute w-6 h-6 text-white transition-all duration-500"
            />
          </button>
        </div>
      </div>
    </div>

    <div class="detail-tabs flex gap-4 mt-4 mb-2 animate-fade-in-up">
      <span
        @click="activeTab = 'description'"
        :class="
            activeTab === 'description'
            ? 'detail-tab detail-tab-active'
            : 'detail-tab'
        "
        class="pb-1 font-semibold transition-all"
      >
        {{ $t("description") }}
      </span>
      <span
        @click="activeTab = 'characteristic'"
        :class="
            activeTab === 'characteristic'
            ? 'detail-tab detail-tab-active'
            : 'detail-tab'
        "
        class="pb-1 font-semibold transition-all"
        >{{ $t("characteristic") }}
      </span>
    </div>
    <span
      v-if="activeTab !== 'characteristic'"
      v-html="store.product[`description_${locale}`]"
      class="detail-content animate-fade-in"
    ></span>
    <span
      v-if="activeTab === 'characteristic'"
      v-html="
        store.product[`characteristic_${locale}`]?.replace(/\r?\n/g, '<br>')
      "
      class="detail-content animate-fade-in"
    ></span>
    <h3
      v-if="relatedProducts.length"
      class="related-heading text-3xl font-bold text-blue-900 mt-[40px] mb-6 animate-fade-in-up"
    >
      {{ t("related_products") }}
    </h3>
    <div
      class="related-grid grid grid-cols-1 mb-[30px] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
    >
      <div
        v-for="(product, index) in relatedProducts"
        :key="product.id"
        :ref="(el) => (relatedProductRefs[index] = el)"
        :style="{ 'transition-delay': `${index * 100}ms` }"
        class="related-card group"
      >
        <div
          @click="goToDetail(product.id)"
          class="related-media cursor-pointer"
        >
          <span class="related-chip">#{{ product.id }}</span>
          <img
            :src="normalizeImages(product.images)[0]"
            alt="Image"
            class="related-image"
          />
        </div>
        <h3
          @click="goToDetail(product.id)"
          class="related-title"
        >
          {{ product[`name_${locale}`] }}
        </h3>
        <p class="related-price">
          {{ formatPrice(product[`price_${locale}`]) }}
        </p>

        <div class="flex gap-2">
          <button
            @click="handleClick(product)"
            class="relative flex-1 cursor-pointer flex items-center justify-center gap-2 buttonShop related-btn text-white py-2.5 rounded-xl font-medium overflow-hidden"
          >
            <span
              class="transition-all duration-300"
              :class="
                animating[product.id]
                  ? 'opacity-0 scale-0'
                  : 'opacity-100 scale-100'
              "
            >
              {{ relatedActionLabel(product) }}
            </span>
            <ShoppingCart
              class="related-cart-icon absolute w-5 h-5 transition-all duration-500"
              :class="
                animating[product.id]
                  ? 'translate-x-44 opacity-0'
                  : 'translate-x-0 opacity-100'
              "
            />
            <Check
              class="absolute w-6 h-6 text-white transition-all duration-500"
              :class="
                showCheck[product.id]
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-0'
              "
            />
          </button>
        </div>
      </div>
    </div>
  </div>
  <Notification
    v-if="notification.show"
    :message="notification.message"
    :show="notification.show"
    @close="notification.show = false"
    class="z-[999999999999999]"
  />
</template>

<style scoped>
.detail-page {
  background:
    radial-gradient(circle at 0% 0%, rgba(24, 79, 149, 0.08), transparent 32%),
    radial-gradient(circle at 100% 100%, rgba(15, 43, 102, 0.06), transparent 34%);
  padding-bottom: 1.6rem;
}

.detail-topbar {
  min-height: 44px;
}

.detail-page-title {
  color: #133166;
  letter-spacing: -0.015em;
}

.detail-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(20, 54, 108, 0.18);
  border-radius: 12px;
  background: #ffffff;
  color: #1b457f;
  padding: 2px;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

.detail-back:hover {
  transform: translateX(-1px);
  border-color: rgba(20, 54, 108, 0.32);
}

.detail-main {
  border-radius: 18px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 30px rgba(8, 30, 72, 0.08);
  padding: clamp(0.9rem, 2vw, 1.3rem);
}

.detail-swiper {
  border: 1px solid rgba(20, 54, 108, 0.12);
  box-shadow: 0 14px 24px rgba(8, 30, 72, 0.1);
}

.detail-slide-image {
  background: linear-gradient(180deg, #fbfdff, #f4f8ff);
}

.detail-thumbs {
  width: 100%;
}

.detail-thumb {
  border-color: rgba(20, 54, 108, 0.16);
  background: #ffffff;
  flex-shrink: 0;
}

.detail-info {
  color: #193a67;
}

.detail-summary {
  display: grid;
  gap: 1rem;
}

.detail-name {
  color: #142f5f;
  font-size: clamp(1.7rem, 2.8vw, 2.4rem);
}

.detail-price-box {
  display: inline-flex;
  flex-direction: column;
  gap: 0.55rem;
  align-items: flex-start;
  width: fit-content;
  max-width: 100%;
  padding: 1rem 1.15rem;
  border-radius: 20px;
  border: 1px solid rgba(20, 54, 108, 0.1);
  background: linear-gradient(180deg, rgba(251, 253, 255, 0.96), rgba(240, 246, 255, 0.9));
  box-shadow: 0 14px 24px rgba(8, 30, 72, 0.08);
}

.detail-price {
  color: #143d7a;
}

.detail-price-label {
  color: #6b7f9b;
}

.detail-actions {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.credit-card {
  display: grid;
  gap: 1rem;
  padding: 1.05rem 1.1rem;
  border-radius: 22px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background:
    radial-gradient(circle at top right, rgba(42, 122, 83, 0.08), transparent 28%),
    linear-gradient(180deg, #f7fcf8 0%, #f1f8f4 100%);
  box-shadow: 0 16px 26px rgba(8, 30, 72, 0.06);
}

.credit-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.credit-kicker {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #5a8b6f;
}

.credit-heading {
  margin-top: 0.24rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: #173c5c;
}

.credit-rate-pill {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(39, 117, 80, 0.1);
  color: #236846;
  padding: 0.45rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 700;
}

.credit-pill-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.credit-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.credit-metric {
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(34, 108, 73, 0.08);
}

.credit-metric-label {
  display: block;
  font-size: 0.8rem;
  color: #698175;
}

.credit-metric-value {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.12rem;
  color: #153c5b;
}

.credit-note {
  grid-column: 1 / -1;
  font-size: 0.86rem;
  color: #4f6a5b;
}

.detail-options {
  border-color: rgba(20, 54, 108, 0.12);
  background: linear-gradient(180deg, rgba(249, 251, 255, 0.96), rgba(240, 246, 255, 0.88));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.detail-options-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-options-kicker {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7084a4;
}

.detail-option-group {
  display: grid;
  gap: 0.8rem;
}

.detail-option-headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.detail-option {
  min-width: 132px;
  border-radius: 14px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: #ffffff;
  color: #1c3864;
  padding: 0.8rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.detail-option:hover {
  border-color: rgba(20, 54, 108, 0.24);
  transform: translateY(-1px);
}

.detail-option-active {
  border-color: rgba(20, 79, 149, 0.38);
  box-shadow: 0 10px 18px rgba(10, 31, 75, 0.1);
  background: linear-gradient(180deg, #f7fbff, #eef5ff);
}

.qty-box {
  border-color: rgba(20, 54, 108, 0.16);
}

.qty-btn {
  background: #edf3ff;
}

.qty-btn:hover {
  background: #dae8ff;
}

.qty-input {
  color: #2a3e5f;
}

.detail-add-btn {
  background: #143d7a;
  border: 1px solid rgba(20, 54, 108, 0.18);
  box-shadow: 0 14px 24px rgba(8, 30, 72, 0.22);
}

.detail-add-btn:hover {
  background: #0f2f61;
}

.detail-tabs {
  border-bottom: 1px solid rgba(20, 54, 108, 0.14);
  padding-bottom: 0.45rem;
}

.detail-tab {
  color: #637a9f;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  padding-bottom: 0.25rem;
}

.detail-tab-active {
  color: #1a447f;
  border-bottom-color: #1a4f95;
}

.detail-content {
  display: block;
  color: #3a4f70;
  line-height: 1.7;
  font-size: 0.97rem;
}

.related-heading {
  color: #14315f;
}

.related-grid {
  gap: 1.2rem;
}

.buttonShop {
  background: #143d7a;
  border: 1px solid rgba(20, 54, 108, 0.14);
  box-shadow: 0 10px 16px rgba(8, 33, 76, 0.2);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.related-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 20px rgba(8, 33, 76, 0.24);
}

.related-card {
  border-radius: 16px;
  border: 1px solid rgba(20, 54, 108, 0.14);
  background: #ffffff;
  box-shadow: 0 12px 22px rgba(10, 31, 75, 0.08);
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  transition:
    opacity 0.7s ease-out,
    transform 0.7s ease-out,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.related-card:hover {
  border-color: rgba(20, 54, 108, 0.24);
  box-shadow: 0 20px 30px rgba(10, 31, 75, 0.14);
}

.related-card.animate-show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.related-media {
  position: relative;
  min-height: 150px;
  border-radius: 12px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: linear-gradient(180deg, #fbfdff, #f3f7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
}

.related-chip {
  position: absolute;
  left: 10px;
  top: 10px;
  border-radius: 999px;
  background: rgba(20, 62, 122, 0.1);
  color: #1a4a89;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 800;
}

.related-image {
  width: 100%;
  max-width: 128px;
  height: 100%;
  max-height: 128px;
  object-fit: contain;
  transition: transform 0.45s ease;
}

.related-card:hover .related-image {
  transform: translateY(-3px) scale(1.06);
}

.related-title {
  margin-top: 10px;
  color: #1a3968;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  min-height: 42px;
  cursor: pointer;
}

.related-price {
  margin-top: 8px;
  margin-bottom: 10px;
  color: #12325f;
  font-size: 1rem;
  font-weight: 800;
  text-align: left;
}

.related-cart-icon {
  left: 12px;
}

.animate-fade-in-down {
  animation: fadeInDown 0.8s ease-out forwards;
}

.animate-slide-in-up {
  animation: slideInUp 0.8s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out forwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .related-title {
    font-size: 0.88rem;
  }

  .related-price {
    font-size: 0.92rem;
  }

  .related-cart-icon {
    left: 9px;
  }

  .detail-add-btn {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .detail-page {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }

  .detail-main {
    border-radius: 14px;
    padding: 0.75rem;
  }

  .detail-price-box {
    width: 100%;
  }

  .credit-card-head {
    flex-direction: column;
    align-items: stretch;
  }

  .credit-rate-pill {
    width: fit-content;
  }

  .credit-summary {
    grid-template-columns: 1fr;
  }

  .detail-option {
    width: 100%;
  }

  .detail-swiper,
  .detail-slide-image {
    height: 320px;
  }
}
</style>
