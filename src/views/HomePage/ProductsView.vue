<script setup>
import { ref, onMounted, nextTick } from "vue";
import Notification from "../../components/Notification.vue";
import { useProductsStore } from "../../store/productsStore";
import { useBasketStore } from "../../store/basketStore";
import { ShoppingCart, Check } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useLoaderStore } from "@/store/loaderStore";
import { resolveAssetUrls } from "@/lib/api";
import {
  buildConfiguredBasketItem,
  formatPriceValue,
  getProductDefaultPrice,
  getInstallmentPlan,
} from "@/lib/productOptions";

const router = useRouter();
const { t, locale } = useI18n();
const productsStore = useProductsStore();
const basketStore = useBasketStore();
const productRefs = ref([]);
const normalizeImages = (images) => resolveAssetUrls(images);
const animating = ref({});
const showCheck = ref({});
const notification = ref({ show: false, message: "" });
const formatPrice = (price) => formatPriceValue(price);
const getProductDisplayPrice = (product) =>
  getProductDefaultPrice(product, locale.value);
const INSTALLMENT_MONTHS = 12;
const getProductInstallment = (product) =>
  getInstallmentPlan(product, locale.value, INSTALLMENT_MONTHS);
const formatInstallmentLabel = (product) => {
  const installment = getProductInstallment(product);
  if (!installment) {
    return "";
  }

  return `${installment.months} ${t("credit.months")} • ${formatPrice(installment.monthlyPayment)}`;
};

onMounted(async () => {
  if (!productsStore.products.length) {
    useLoaderStore().loader = true;
    await productsStore.fetchProducts(200, 0);
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
  const id = product.id;
  if (animating.value[id]) return;
  animating.value = { ...animating.value, [id]: true };
  setTimeout(() => {
    showCheck.value = { ...showCheck.value, [id]: true };
  }, 600);
  setTimeout(() => {
    showCheck.value = { ...showCheck.value, [id]: false };
    animating.value = { ...animating.value, [id]: false };
  }, 1800);
  basketStore.addToBasket(
    buildConfiguredBasketItem(product, {}, 1, { useFallbackPath: false })
  );
  notification.value = {
    show: true,
    message: `${product[`name_${locale.value}`]} ${t("add_to_cart2")}`,
  };
};
const goToDetail = (id) => {
  router.push({ name: "ProductDetail", params: { id } });
  productsStore.fetchProductDetail(id);
};
const actionLabel = () => t("add_to_cart");
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
          v-for="(product, index) in productsStore.products.slice(0, 8)"
          :key="product.id"
          :ref="(el) => (productRefs[index] = el)"
          :style="{ 'transition-delay': `${index * 50}ms` }"
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
              <span
                class="transition-all duration-300 max-xl:text-[15px] max-md:text-[10px]"
                :class="
                  animating[product.id]
                    ? 'opacity-0 scale-0'
                    : 'opacity-100 scale-100'
                "
              >
                {{ actionLabel(product) }}
              </span>
              <ShoppingCart
                class="cart-icon absolute w-5 h-5 transition-all duration-500"
                :class="
                  animating[product.id]
                    ? 'translate-x-32 opacity-0'
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
      <div class="text-center mt-6">
        <RouterLink
          to="/products"
          class="section-link"
        >
          {{ t("products.allProducts") }}
        </RouterLink>
      </div>
    </div>
    <Notification
      v-if="notification.show"
      :message="notification.message"
      :show="notification.show"
      @close="notification.show = false"
      class="z-[999999999999999]"
    />
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
  margin-top: 10px;
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
</style>
