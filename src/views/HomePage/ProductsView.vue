<script setup>
import { computed, onMounted } from "vue";
import { useProductsStore } from "../../store/productsStore";
import { ArrowRight } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useCreditTariffsStore } from "@/store/creditTariffsStore";
import { resolveAssetUrls } from "@/lib/api";
import {
  formatPriceValue,
  getProductDefaultPrice,
  getInstallmentPlan,
} from "@/lib/productOptions";
import { matchesProductSearch, scoreProductSearch } from "@/lib/productSearch";

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const productsStore = useProductsStore();
const creditTariffsStore = useCreditTariffsStore();
const normalizeImages = (images) => resolveAssetUrls(images);
const formatPrice = (price) => formatPriceValue(price);
const getProductDisplayPrice = (product) =>
  getProductDefaultPrice(product, locale.value);
const getProductDisplayName = (product) =>
  product?.[`short_name_${locale.value}`] ||
  product?.[`name_${locale.value}`] ||
  product?.name_ru ||
  product?.name_uz ||
  "";
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

  return `${installment.months} ${t("credit.months")} • ${formatPrice(installment.monthlyPayment)}`;
};

onMounted(async () => {
  await Promise.all([
    productsStore.fetchProducts(1000, 0),
    creditTariffsStore.fetchTariffs(),
  ]);
});
const handleClick = (product) => {
  // Product card ichidagi tugma bosilganda: faqat detailga kirish.
  goToDetail(product.id);
};
const goToDetail = (id, options = {}) => {
  router.push({
    name: "ProductDetail",
    params: { id },
    query: options.openImage ? { image: "0" } : {},
  });
  productsStore.fetchProductDetail(id);
};
const actionLabel = () => t("header.more");

const getProductOrder = (product) => {
  const raw =
    product?.order ?? product?.display_order ?? product?.sort_order ?? product?.position ?? 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 999999;
};

const sortedProducts = computed(() => {
  const list = Array.isArray(productsStore.products)
    ? [...productsStore.products]
    : [];

  list.sort(
    (a, b) =>
      getProductOrder(a) - getProductOrder(b) ||
      Number(a?.id ?? 0) - Number(b?.id ?? 0)
  );

  return list;
});

const homeSearchQuery = computed(() => String(route.query.search || "").trim());

const filteredProducts = computed(() => {
  const query = homeSearchQuery.value;
  const list = [...sortedProducts.value];

  if (!query) {
    return list;
  }

  return list
    .filter((product) => matchesProductSearch(product, query))
    .sort(
      (a, b) =>
        scoreProductSearch(b, query, locale.value) -
          scoreProductSearch(a, query, locale.value) ||
        getProductOrder(a) - getProductOrder(b) ||
        Number(a?.id ?? 0) - Number(b?.id ?? 0)
    );
});

const showProductSkeletons = computed(
  () => productsStore.loading && !filteredProducts.value.length
);

const productSkeletonItems = Array.from({ length: 8 }, (_, index) => index);
</script>

<template>
  <div
    class="home-products-section py-12"
    :class="{ 'home-products-section-search': homeSearchQuery }"
  >
    <div class="container mx-auto px-6">
      <h2 class="section-title">
        {{ t("products.title") }}
      </h2>
      <div
        class="products-grid grid grid-cols-4 max-lg:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-4 gap-6"
      >
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="product-card group"
        >
          <div @click="goToDetail(product.id)" class="card-body cursor-pointer">
            <div class="product-media">
              <span class="product-chip">#{{ product.id }}</span>
              <img
                :src="normalizeImages(product.images)[0]"
                alt="Image"
                loading="lazy"
                class="product-image"
              />
            </div>
          </div>
          <div class="card-footer">
            <h3 class="product-title">
              {{ getProductDisplayName(product) }}
            </h3>
            <p class="product-price">
              {{ formatPrice(getProductDisplayPrice(product)) }}
            </p>
            <p
              v-if="getProductInstallment(product)"
              class="product-installment"
            >
              {{ formatInstallmentLabel(product) }}
            </p>

            <button
              @click="handleClick(product)"
              class="add-btn relative mt-[10px] w-full cursor-pointer flex items-center justify-center gap-2 text-white py-1.5 rounded-xl font-medium overflow-hidden"
            >
              <span class="transition-all duration-300 max-xl:text-[15px] max-md:text-[10px]">
                {{ actionLabel() }}
              </span>
              <ArrowRight class="cart-icon absolute w-5 h-5 transition-all duration-500" />
            </button>
          </div>
        </div>
        <template v-if="showProductSkeletons">
          <div
            v-for="item in productSkeletonItems"
            :key="`product-skeleton-${item}`"
            class="product-card product-card-skeleton"
            aria-hidden="true"
          >
            <div class="product-skeleton-media"></div>
            <div class="card-footer product-skeleton-footer">
              <span class="product-skeleton-line product-skeleton-line-title"></span>
              <span class="product-skeleton-line product-skeleton-line-price"></span>
              <span class="product-skeleton-line product-skeleton-line-badge"></span>
              <span class="product-skeleton-button"></span>
            </div>
          </div>
        </template>
      </div>
      <div
        v-if="homeSearchQuery && !filteredProducts.length && !showProductSkeletons"
        class="home-products-empty"
      >
        {{ t("nav.no_results") }}
      </div>
      <div class="text-center mt-6">
        <RouterLink
          to="/products"
          class="section-link"
        >
          {{ t("products.allProducts") }}
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-products-section {
  background: transparent;
}

.home-products-section.home-products-section-search {
  padding-top: 6.5rem;
}

@media (max-width: 640px) {
  .home-products-section.home-products-section-search {
    padding-top: 5.75rem;
  }
}

.section-title {
  margin-bottom: clamp(2rem, 4vw, 3.2rem);
  text-align: center;
  color: #142338;
  font-size: clamp(1.8rem, 3.1vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.88);
  color: #18304f;
  font-size: 0.95rem;
  font-weight: 700;
  padding: 0.82rem 1.1rem;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

.section-link::after {
  content: ">";
  transition: transform 0.2s ease;
}

.section-link:hover {
  border-color: rgba(20, 35, 56, 0.22);
  transform: translateY(-1px);
}

.section-link:hover::after {
  transform: translateX(2px);
}

.home-products-empty {
  display: grid;
  place-items: center;
  min-height: 180px;
  border-radius: 24px;
  border: 1px dashed rgba(20, 35, 56, 0.16);
  background: rgba(255, 255, 255, 0.74);
  color: #52647c;
  font-size: 1rem;
  font-weight: 700;
}

.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  border: none;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.product-card:hover {
  transform: translateY(-2px);
}

.product-card-skeleton {
  pointer-events: none;
}

.product-card-skeleton:hover {
  transform: none;
}

.product-skeleton-media,
.product-skeleton-line,
.product-skeleton-button {
  display: block;
  background:
    linear-gradient(90deg, #eef2f6 0%, #f8fafc 46%, #e7edf3 100%);
  background-size: 220% 100%;
  animation: product-skeleton-shimmer 1.15s ease-in-out infinite;
}

.product-skeleton-media {
  aspect-ratio: 1 / 1;
  border-radius: 8px;
}

.product-skeleton-footer {
  gap: 0.55rem;
}

.product-skeleton-line {
  height: 0.78rem;
  border-radius: 999px;
}

.product-skeleton-line-title {
  width: 82%;
}

.product-skeleton-line-price {
  width: 58%;
  height: 1rem;
}

.product-skeleton-line-badge {
  width: 74%;
}

.product-skeleton-button {
  width: 100%;
  height: 34px;
  margin-top: auto;
  border-radius: 10px;
}

@keyframes product-skeleton-shimmer {
  0% {
    background-position: 120% 0;
  }

  100% {
    background-position: -120% 0;
  }
}

.card-body {
  display: flex;
  flex-direction: column;
}

.product-media {
  position: relative;
  width: 100%;
  margin: 0;
  aspect-ratio: 1 / 1;
  border: none;
  border-radius: 8px;
  background: #f3f5f7;
  overflow: hidden;
}

@media screen and (max-width: 640px) {
  .product-image {
    object-fit: contain;
  }
}

.product-chip {
  position: absolute;
  left: 10px;
  top: 10px;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 800;
  color: #41536f;
  background: rgba(20, 35, 56, 0.06);
}

.product-image {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 8px;
  object-fit: contain;
  object-position: center;
  transition: transform 0.45s ease;
}

.product-card:hover .product-image {
  transform: scale(1.02);
}

.product-title {
  margin: 0;
  text-align: left;
  font-size: 0.95rem;
  line-height: 1.45;
  font-weight: 700;
  color: #1b2d44;
}

.card-footer {
  margin-top: auto;
  padding: 10px 12px 12px;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
}

.product-price {
  color: #142338;
  font-size: 1.02rem;
  font-weight: 800;
  margin-bottom: 0.6rem;
}

.product-installment {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  border-radius: 14px;
  padding: 0.42rem 0.72rem;
  margin-bottom: 0.85rem;
  background: linear-gradient(135deg, #eff8f1 0%, #dcefe3 100%);
  color: #184b33;
  border: 1px solid rgba(72, 122, 93, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  font-size: 0.74rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.01em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.add-btn {
  background: #18304f;
  border: 1px solid rgba(20, 35, 56, 0.06);
  margin-top: auto;
  min-height: 34px;
  transition: transform 0.25s ease;
}

.add-btn:hover {
  transform: translateY(-1px);
  background: #142338;
}

.cart-icon {
  left: 14px;
}

@media (max-width: 1024px) {
  .product-title {
    font-size: 0.88rem;
  }

  .product-price {
    font-size: 0.94rem;
  }

  .product-installment {
    font-size: 0.64rem;
    padding: 0.34rem 0.5rem;
  }

  .cart-icon {
    left: 9px;
  }
}

@media (max-width: 640px) {
  .home-products-section {
    padding-bottom: 2.25rem;
  }

  .home-products-section :deep(.container) {
    padding-left: 14px;
    padding-right: 14px;
  }

  .products-grid {
    gap: 14px 12px;
    align-items: stretch;
  }

  .product-card {
    min-height: 100%;
    border-radius: 8px;
  }

  .card-footer {
    padding: 8px 8px 10px;
  }

  .product-media {
    width: 100%;
    margin: 0;
    border-radius: 8px;
  }

  .product-chip {
    left: 7px;
    top: 7px;
    padding: 3px 7px;
    font-size: 9px;
  }

  .product-title {
    order: 3;
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.28;
    font-weight: 600;
    color: #314159;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .product-price {
    order: 1;
    margin-bottom: 0.4rem;
    font-size: 1rem;
    line-height: 1.1;
  }

  .product-installment {
    order: 2;
    align-self: flex-start;
    width: auto;
    max-width: 100%;
    margin-bottom: 0.45rem;
    border-radius: 8px;
    padding: 0.28rem 0.4rem;
    font-size: 0.66rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .add-btn {
    order: 4;
    min-height: 30px;
    border-radius: 10px;
    padding-top: 0.28rem;
    padding-bottom: 0.28rem;
  }

  .cart-icon {
    left: 10px;
    width: 18px;
    height: 18px;
  }
}

@media (max-width: 600px) {
  .home-products-section {
    padding-top: 0;
  }

  .section-title {
    margin-bottom: 0;
  }
}
</style>
