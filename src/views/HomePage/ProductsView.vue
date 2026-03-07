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
const router = useRouter();
const { t, locale } = useI18n();
const productsStore = useProductsStore();
const basketStore = useBasketStore();
const productRefs = ref([]);
const normalizeImages = (images) => resolveAssetUrls(images);
const animating = ref({});
const showCheck = ref({});
const notification = ref({ show: false, message: "" });
const formatPrice = (price) => {
  if (!price) return "";
  const numeric = parseInt(price.toString().replace(/[^\d]/g, ""), 10);
  if (isNaN(numeric)) return price;
  return numeric.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " UZS";
};

onMounted(async () => {
  // Mahsulotlar yuklanishini kutish
  useLoaderStore().loader = true;
  await productsStore.fetchProducts();
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
  basketStore.addToBasket(product);
  notification.value = {
    show: true,
    message: `${product[`name_${locale.value}`]} ${t("add_to_cart2")}`,
  };
};
const goToDetail = (id) => {
  router.push({ name: "ProductDetail", params: { id } });
  productsStore.fetchProductDetail(id);
};
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
              {{ formatPrice(product[`price_${locale}`]) }}
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
                {{ t("add_to_cart") }}
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
  background: linear-gradient(180deg, #f9fbff 0%, #f1f6ff 100%);
}

.section-title {
  margin-bottom: clamp(2rem, 4vw, 3.2rem);
  text-align: center;
  color: #132f62;
  font-size: clamp(1.8rem, 3.1vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #194583;
  font-size: 1rem;
  font-weight: 700;
  transition: color 0.2s ease;
}

.section-link::after {
  content: ">";
  transition: transform 0.2s ease;
}

.section-link:hover {
  color: #0f2f61;
}

.section-link:hover::after {
  transform: translateX(2px);
}

.product-card {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(20, 54, 108, 0.13);
  background: #ffffff;
  box-shadow: 0 12px 22px rgba(8, 30, 72, 0.07);
  padding: 12px;
  opacity: 0;
  transform: translateY(40px) scale(0.9);
  transition:
    opacity 0.5s ease,
    transform 0.5s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 30px rgba(8, 30, 72, 0.13);
  border-color: rgba(20, 54, 108, 0.26);
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
  min-height: 150px;
  border-radius: 14px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: linear-gradient(180deg, #fbfdff, #f3f7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
}

.product-chip {
  position: absolute;
  left: 10px;
  top: 10px;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 800;
  color: #1b4a8a;
  background: rgba(20, 62, 122, 0.1);
}

.product-image {
  width: 100%;
  max-width: 140px;
  height: 100%;
  max-height: 130px;
  object-fit: contain;
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
  color: #1b3968;
  min-height: 46px;
}

.card-footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(20, 54, 108, 0.16);
}

.product-price {
  color: #12325f;
  font-size: 1.02rem;
  font-weight: 800;
  margin-bottom: 10px;
}

.add-btn {
  background: #143d7a;
  border: 1px solid rgba(20, 54, 108, 0.14);
  box-shadow: 0 10px 16px rgba(8, 33, 76, 0.18);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 20px rgba(8, 33, 76, 0.24);
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

  .cart-icon {
    left: 9px;
  }
}
</style>
