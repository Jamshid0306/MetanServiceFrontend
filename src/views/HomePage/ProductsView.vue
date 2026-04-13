<script setup>
import { computed, ref, onMounted, nextTick } from "vue";
import { useProductsStore } from "../../store/productsStore";
import { ArrowRight } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useLoaderStore } from "@/store/loaderStore";
import { useCreditTariffsStore } from "@/store/creditTariffsStore";
import { resolveAssetUrls } from "@/lib/api";
import {
  formatPriceValue,
  getProductDefaultPrice,
  getInstallmentPlan,
} from "@/lib/productOptions";

const router = useRouter();
const { t, locale } = useI18n();
const productsStore = useProductsStore();
const creditTariffsStore = useCreditTariffsStore();
const loaderStore = useLoaderStore();
const productRefs = ref([]);
const normalizeImages = (images) => resolveAssetUrls(images);
const formatPrice = (price) => formatPriceValue(price);
const getProductDisplayPrice = (product) =>
  getProductDefaultPrice(product, locale.value);
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
  const shouldShowLoader = !productsStore.products.length;
  if (shouldShowLoader) {
    loaderStore.loader = true;
  }

  await Promise.all([
    productsStore.products.length ? Promise.resolve() : productsStore.fetchProducts(200, 0),
    creditTariffsStore.fetchTariffs(),
  ]);

  if (shouldShowLoader) {
    loaderStore.loader = false;
  }

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
    { threshold: 0.5 }
  );
  productRefs.value.forEach((el) => {
    if (el) observer.observe(el);
  });
});
const handleClick = (product) => {
  // Product card ichidagi tugma bosilganda: faqat detailga kirish.
  goToDetail(product.id);
};
const goToDetail = (id) => {
  router.push({ name: "ProductDetail", params: { id } });
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
</script>

<template>
  <div class="home-products-section py-12">
    <div class="container mx-auto px-6">
      <h2 class="section-title animate-fade-in-down">
        {{ t("products.title") }}
      </h2>
      <div
        class="grid grid-cols-4 max-lg:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-4 gap-6"
      >
        <div
          v-for="(product, index) in sortedProducts"
          :key="product.id"
          :ref="(el) => (productRefs[index] = el)"
          :style="{ 'transition-delay': `${Math.min(index, 20) * 50}ms` }"
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
            <h3 class="product-title">
              {{ product[`name_${locale}`] }}
            </h3>
          </div>
          <div class="card-footer">
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
              class="add-btn relative w-full flex-1 cursor-pointer flex items-center justify-center gap-2 text-white py-2.5 rounded-xl font-medium overflow-hidden"
            >
              <span class="transition-all duration-300 max-xl:text-[15px] max-md:text-[10px]">
                {{ actionLabel() }}
              </span>
              <ArrowRight class="cart-icon absolute w-5 h-5 transition-all duration-500" />
            </button>
          </div>
        </div>
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

.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #ffffff;
  padding: 12px;
  opacity: 0;
  transform: translateY(40px) scale(0.9);
  transition:
    opacity 0.5s ease,
    transform 0.5s ease,
    border-color 0.3s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 35, 56, 0.18);
}

.product-card.animate-show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.card-body {
  display: flex;
  flex-direction: column;
}

.product-media {
  position: relative;
  min-height: 170px;
  height: 170px;
  border-radius: 16px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #f3f5f7;
  overflow: hidden;
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
  object-fit: cover;
  transition: transform 0.45s ease;
}

.product-card:hover .product-image {
  transform: translateY(-4px) scale(1.06);
}

.product-title {
  margin-top: 12px;
  text-align: left;
  font-size: 0.95rem;
  line-height: 1.45;
  font-weight: 700;
  color: #1b2d44;
  min-height: 46px;
}

.card-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(20, 35, 56, 0.08);
}

.product-price {
  color: #142338;
  font-size: 1.02rem;
  font-weight: 800;
  margin-bottom: 0.45rem;
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
  transition: transform 0.25s ease;
}

.add-btn:hover {
  transform: translateY(-1px);
  background: #142338;
}

.cart-icon {
  left: 14px;
}

.animate-fade-in-down {
  animation: fadeInDown 1s ease-out forwards;
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

@media (max-width: 1024px) {
  .product-title {
    font-size: 0.88rem;
    min-height: 42px;
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
  .product-card {
    padding: 12px 12px 14px;
    min-height: 100%;
  }

  .card-footer {
    padding-top: 12px;
  }

  .add-btn {
    margin-top: 0.25rem;
  }
}
</style>
