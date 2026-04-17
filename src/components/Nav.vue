<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useProductsStore } from "../store/productsStore";
import { useBasketStore } from "../store/basketStore";
import { useLoaderStore } from "@/store/loaderStore";
import { resolveAssetUrl } from "@/lib/api";
import {
  CUSTOMER_SESSION_EVENT,
  clearCustomerSession,
  getStoredCustomerSession,
} from "@/lib/customerSession";
import { matchesProductSearch, scoreProductSearch } from "@/lib/productSearch";
import { CONTACT_PHONE_HREF } from "@/constants/contact";
import Basket from "./icons/Basket.vue";
import uzFlag from "@/assets/images/uz.png";
import ruFlag from "@/assets/images/ru.png";
import brandLogo from "@/assets/images/logo.jpg";

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const productsStore = useProductsStore();
const basketStore = useBasketStore();
const loaderStore = useLoaderStore();

const langOpen = ref(false);
const isSticky = ref(false);
const searchQuery = ref("");
const customerProfile = ref(null);

const languages = [
  { code: "uz", label: "O'zbekcha", flag: uzFlag },
  { code: "ru", label: "Русский", flag: ruFlag },
];
const activeLanguage = computed(
  () => languages.find((lang) => lang.code === locale.value) || languages[0]
);
const customerInitial = computed(
  () => String(customerProfile.value?.name || "U").trim().charAt(0).toUpperCase() || "U"
);
const customerDisplayName = computed(() => {
  const name = String(customerProfile.value?.name || "").trim();
  if (!name) {
    return t("nav.login");
  }

  return name;
});
const isProfileRoute = computed(() => route.path.startsWith("/profile"));
const syncCustomerProfile = () => {
  customerProfile.value = getStoredCustomerSession();
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

const filteredProducts = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return [];

  return (productsStore.products || [])
    .filter((product) => matchesProductSearch(product, searchQuery.value))
    .sort(
      (a, b) =>
        scoreProductSearch(b, searchQuery.value, locale.value) -
          scoreProductSearch(a, searchQuery.value, locale.value) ||
        getProductOrder(a) - getProductOrder(b) ||
        Number(a?.id ?? 0) - Number(b?.id ?? 0)
    )
    .slice(0, 12);
});

const selectProduct = (product) => {
  loaderStore.loader = true;
  searchQuery.value = product[`name_${locale.value}`];
  router.push({ name: "ProductDetail", params: { id: product.id } });
};

const getProductImage = (product) =>
  resolveAssetUrl(product?.images?.[0]) || "/placeholder.png";

const toggleLang = () => {
  langOpen.value = !langOpen.value;
};

const changeLanguage = (lang) => {
  locale.value = lang;
  langOpen.value = false;
  localStorage.setItem("lang", lang);
};

const handleScroll = () => {
  isSticky.value = window.scrollY > 20;
};

onMounted(async () => {
  const savedLang = localStorage.getItem("lang");
  if (savedLang) locale.value = savedLang;
  syncCustomerProfile();

  if (!productsStore.products.length) {
    await productsStore.fetchProducts(1000, 0);
  }

  window.addEventListener("scroll", handleScroll);
  window.addEventListener("storage", syncCustomerProfile);
  window.addEventListener(CUSTOMER_SESSION_EVENT, syncCustomerProfile);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("storage", syncCustomerProfile);
  window.removeEventListener(CUSTOMER_SESSION_EVENT, syncCustomerProfile);
});

const logoutCustomer = () => {
  clearCustomerSession();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("customer_access_token");
  }
  syncCustomerProfile();
  router.push("/login");
};

watch(
  () => route.fullPath,
  () => {
    searchQuery.value = "";
    langOpen.value = false;
  }
);
</script>

<template>
  <header>
    <nav
      class="brand-nav fixed left-0 top-0 w-full z-[999] transition-all duration-300"
      :class="isSticky ? 'nav-sticky' : 'nav-rest'"
    >
      <div class="container mx-auto px-4 nav-shell">
        <div class="nav-top-row">
          <RouterLink to="/" class="brand-logo-wrap flex-shrink-0" aria-label="Home">
            <span class="logo-halo" />
            <img
              :src="brandLogo"
              alt="Urganch Metan Service logo"
              class="brand-logo h-10 sm:h-12 md:h-14 w-auto max-w-[170px]"
            />
          </RouterLink>

          <div class="mobile-actions lg:hidden">
            <div class="mobile-search-inline relative z-40">
              <input
                v-model="searchQuery"
                type="search"
                :placeholder="t('nav.search_products') + '...'"
                class="search-input mobile-search-input w-full pl-10 pr-3 py-2 text-sm"
              />
              <svg
                class="absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>

              <div
                v-if="filteredProducts.length"
                class="absolute top-full left-0 mt-2 w-full search-dropdown max-h-80 overflow-y-auto"
              >
                <div
                  v-for="product in filteredProducts"
                  :key="product.id"
                  @click="selectProduct(product)"
                  class="search-row flex items-center gap-3 p-3 cursor-pointer"
                >
                  <img
                    :src="getProductImage(product)"
                    alt="Product"
                    class="w-12 h-12 object-cover rounded-xl border border-gray-200"
                  />
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-800 truncate">{{ product[`name_${locale}`] }}</p>
                    <p class="text-xs font-bold text-slate-700">{{ product[`price_${locale}`] || product.price_uz }} so'm</p>
                  </div>
                </div>
              </div>

              <div
                v-else-if="searchQuery.length > 1"
                class="absolute top-full left-0 mt-2 w-full search-dropdown p-4 text-center text-sm text-slate-500"
              >
                {{ t("nav.no_results") }}
              </div>
            </div>

          </div>

          <!-- Desktop layout: center links/search, right actions (login to far right) -->
          <div class="hidden lg:flex flex-1 items-center justify-between gap-6">
            <!-- Left / center: main nav links + search -->
            <div class="flex items-center gap-4 xl:gap-6 text-[14px] xl:text-[15px] font-semibold text-slate-700">
              <RouterLink to="/" class="nav-link">{{ t("nav.main") }}</RouterLink>
              <RouterLink :to="{ path: '/', hash: '#contact' }" class="nav-link">{{ t("nav.contact") }}</RouterLink>
              <RouterLink to="/products" class="products-pill">{{ t("products.allProducts") }}</RouterLink>

              <div class="hidden lg:flex items-center flex-1 max-w-[260px] xl:max-w-md relative z-40">
                <input
                  v-model="searchQuery"
                  type="search"
                  :placeholder="t('nav.search_products') + '...'"
                  class="search-input w-full pl-11 pr-4 py-2.5 text-sm"
                />
                <svg
                  class="absolute left-3.5 h-5 w-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>

                <div
                  v-if="filteredProducts.length"
                  class="absolute top-full left-0 mt-2 w-full search-dropdown max-h-80 overflow-y-auto"
                >
                  <div
                    v-for="product in filteredProducts"
                    :key="product.id"
                    @click="selectProduct(product)"
                    class="search-row flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <img
                      :src="getProductImage(product)"
                      alt="Product"
                      class="w-12 h-12 object-cover rounded-xl border border-gray-200"
                    />
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-slate-800 truncate">{{ product[`name_${locale}`] }}</p>
                      <p class="text-xs font-bold text-slate-700">
                        {{ product[`price_${locale}`] || product.price_uz }} so'm
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  v-else-if="searchQuery.length > 1"
                  class="absolute top-full left-0 mt-2 w-full search-dropdown p-4 text-center text-sm text-slate-500"
                >
                  {{ t("nav.no_results") }}
                </div>
              </div>
            </div>

            <!-- Right: contact + lang + basket + login (login at far right) -->
            <div class="flex items-center gap-2 sm:gap-3 relative">
              <button
                @click="toggleLang"
                class="lang-button flex items-center gap-1 sm:gap-2 p-2 rounded-full text-sm font-semibold text-slate-700"
              >
                <img :src="activeLanguage.flag" class="h-5 w-5 rounded-sm ring-1 ring-slate-200" alt="Lang" />
                <span class="hidden sm:inline">{{ locale.toUpperCase() }}</span>
                <svg
                  class="h-4 w-4 text-slate-700 transition-transform duration-300"
                  :class="{ 'rotate-180': langOpen }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div
                v-if="langOpen"
                class="lang-dropdown absolute right-12 sm:right-14 top-[calc(100%+6px)] w-36 rounded-2xl overflow-hidden z-[1000]"
              >
                <button
                  v-for="lang in languages"
                  :key="lang.code"
                  @click="changeLanguage(lang.code)"
                  class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-100"
                  :class="locale === lang.code ? 'font-bold text-slate-900' : 'text-slate-700'"
                >
                  <img :src="lang.flag" class="w-4 h-4 rounded-sm" alt="Lang" />
                  {{ lang.label }}
                </button>
              </div>

              <RouterLink
                to="/basket"
                class="basket-chip relative rounded-full p-2 text-slate-600 hover:text-slate-950"
              >
                <div
                  v-if="basketStore.basket.length"
                  class="absolute right-0 top-0 bg-rose-600 rounded-full w-5 h-5 text-xs text-white font-bold flex justify-center items-center"
                >
                  {{ basketStore.basket.length }}
                </div>
                <Basket :size="22" />
              </RouterLink>

              <RouterLink v-if="!customerProfile" to="/login" class="login-chip ml-1 sm:ml-2">
                {{ t("nav.login") }}
              </RouterLink>
              <div v-else class="profile-chip ml-1 sm:ml-2" :class="{ 'profile-chip-active': isProfileRoute }">
                <RouterLink to="/profile" class="profile-chip-main">
                  <div class="profile-chip-avatar">
                    <img
                      v-if="customerProfile.photoUrl"
                      :src="customerProfile.photoUrl"
                      :alt="customerDisplayName"
                      class="profile-chip-avatar-image"
                    />
                    <span v-else>{{ customerInitial }}</span>
                  </div>
                  <div class="profile-chip-copy">
                    <strong>{{ customerDisplayName }}</strong>
                    <small>{{ t("profile.orders") }}</small>
                  </div>
                </RouterLink>
                <button type="button" class="profile-chip-logout" @click="logoutCustomer">
                  {{ t("nav.logout") }}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </nav>
  </header>
</template>

<style scoped>
.brand-nav {
  border-bottom: 1px solid rgba(20, 35, 56, 0.08);
  background: rgba(249, 250, 251, 0.86);
  backdrop-filter: blur(14px);
}

.nav-shell {
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
}

.nav-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.nav-rest {
  box-shadow: none;
}

.nav-sticky {
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.05);
}

.brand-logo-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  padding: 3px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.72);
}

.logo-halo {
  display: none;
}

.brand-logo {
  position: relative;
  z-index: 1;
  object-fit: contain;
  border-radius: 10px;
  transition: opacity 0.2s ease;
}

.brand-logo-wrap:hover .brand-logo {
  opacity: 0.92;
}

.nav-link {
  color: #4b5b72;
  position: relative;
  font-weight: 600;
  transition: color 0.2s ease;
}

.nav-link.router-link-active,
.nav-link.router-link-exact-active {
  color: #18304f;
}

.nav-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -5px;
  width: 100%;
  height: 1px;
  background: #24466f;
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.2s ease;
}

.nav-link:hover {
  color: #18304f;
}

.nav-link:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

.products-pill {
  background: #18304f;
  color: #ffffff;
  padding: 9px 15px;
  border-radius: 999px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  transition:
    transform 0.2s ease,
    background-color 0.2s ease;
}

.products-pill:hover {
  background: #142338;
  transform: translateY(-1px);
}

.search-input {
  border-radius: 999px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.86);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: rgba(36, 70, 111, 0.34);
  box-shadow: 0 0 0 3px rgba(36, 70, 111, 0.08);
}

.search-dropdown,
.lang-dropdown {
  border-radius: 14px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.search-row {
  transition: background-color 0.2s ease;
}

.search-row:hover {
  background-color: rgba(20, 35, 56, 0.04);
}

.contact-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 11px;
  border-radius: 999px;
  color: #18304f;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.82);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.contact-chip:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(20, 35, 56, 0.2);
  transform: translateY(-1px);
}

.login-chip,
.mobile-login-chip,
.profile-chip,
.mobile-profile-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.login-chip,
.mobile-login-chip {
  justify-content: center;
  background: #18304f;
  color: #ffffff;
  font-weight: 700;
}

.login-chip {
  padding: 8px 15px;
}

.mobile-login-chip {
  padding: 9px 12px;
  font-size: 0.82rem;
  white-space: nowrap;
}

.profile-chip,
.mobile-profile-chip {
  gap: 0.7rem;
  background: rgba(255, 255, 255, 0.94);
  color: #18304f;
  padding: 6px 8px 6px 6px;
}

.mobile-profile-chip {
  max-width: 190px;
}

.login-chip:hover,
.mobile-login-chip:hover {
  transform: translateY(-1px);
  border-color: #18304f;
  background: #142338;
}

.profile-chip:hover,
.mobile-profile-chip:hover,
.profile-chip-active {
  border-color: rgba(20, 35, 56, 0.24);
  background: rgba(255, 255, 255, 1);
}

.profile-chip-main {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.profile-chip-avatar {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #18304f 0%, #2f5f98 100%);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  overflow: hidden;
}

.profile-chip-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-chip-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.profile-chip-copy strong,
.profile-chip-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-chip-copy strong {
  max-width: 126px;
  font-size: 0.84rem;
  font-weight: 800;
  color: #142338;
}

.profile-chip-copy small {
  margin-top: 0.18rem;
  font-size: 0.7rem;
  color: #64748b;
}

.profile-chip-logout {
  margin-left: 0.15rem;
  border: 0;
  background: transparent;
  color: #18304f;
  font-size: 0.76rem;
  font-weight: 800;
  padding: 0.45rem 0.55rem;
  border-radius: 999px;
  transition: background-color 0.2s ease;
}

.profile-chip-logout:hover {
  background: rgba(20, 35, 56, 0.08);
}

.lang-button {
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.84);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.lang-button:hover {
  border-color: rgba(20, 35, 56, 0.2);
  background: rgba(255, 255, 255, 1);
  transform: translateY(-1px);
}

.basket-chip {
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.84);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.basket-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(20, 35, 56, 0.2);
  background: rgba(255, 255, 255, 1);
}

.mobile-search-inline {
  flex: 1;
  min-width: 0;
  max-width: min(68vw, 420px);
}

.mobile-search-input {
  min-height: 42px;
}

.mobile-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.mobile-lang-wrap {
  flex-shrink: 0;
}

.mobile-lang-button {
  width: 42px;
  height: 42px;
  padding: 0;
}

@media (max-width: 639px) {
  .nav-top-row {
    gap: 0.75rem;
  }

  .mobile-search-inline {
    max-width: min(62vw, 300px);
  }
}

@media (min-width: 1024px) {
  .mobile-actions,
  .mobile-search-inline,
  .mobile-lang-wrap,
  .mobile-lang-button,
  .mobile-lang-dropdown {
    display: none !important;
  }

  .nav-shell {
    min-height: 4rem;
    padding-top: 0;
    padding-bottom: 0;
    display: flex;
    align-items: center;
  }

  .nav-top-row {
    width: 100%;
    gap: 1.5rem;
  }
}

@media (min-width: 1280px) {
  .nav-shell {
    min-height: 5rem;
  }
}

</style>
