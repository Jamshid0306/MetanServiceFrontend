<script setup>
import { onMounted, onUnmounted, ref, watch, computed } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useProductsStore } from "../store/productsStore";
import { useBasketStore } from "../store/basketStore";
import { useLoaderStore } from "@/store/loaderStore";
import { resolveAssetUrl } from "@/lib/api";
import Basket from "./icons/Basket.vue";
import uzFlag from "@/assets/images/uz.png";
import ruFlag from "@/assets/images/ru.png";
import enFlag from "@/assets/images/en.png";

const router = useRouter();
const route = useRoute();
const { t, locale } = useI18n();
const productsStore = useProductsStore();
const basketStore = useBasketStore();
const loaderStore = useLoaderStore();

const menuOpen = ref(false);
const langOpen = ref(false);
const isSticky = ref(false);
const searchQuery = ref("");

const languages = [
  { code: "uz", label: "O'zbekcha", flag: uzFlag },
  { code: "ru", label: "Русский", flag: ruFlag },
  { code: "en", label: "English", flag: enFlag },
];
const activeLanguage = computed(
  () => languages.find((lang) => lang.code === locale.value) || languages[0]
);

const filteredProducts = computed(() => {
  if (!searchQuery.value || searchQuery.value.length < 2) return [];
  return (productsStore.products || []).filter((p) => {
    const name = p[`name_${locale.value}`]?.toLowerCase() || "";
    return name.includes(searchQuery.value.toLowerCase());
  });
});

const selectProduct = (product) => {
  loaderStore.loader = true;
  searchQuery.value = product[`name_${locale.value}`];
  router.push({ name: "ProductDetail", params: { id: product.id } });
  menuOpen.value = false;
};

const getProductImage = (product) =>
  resolveAssetUrl(product?.images?.[0]) || "/placeholder.png";

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
  document.body.style.overflow = menuOpen.value ? "hidden" : "auto";
};

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

const closeMenuAndGo = (to) => {
  menuOpen.value = false;
  document.body.style.overflow = "auto";
  router.push(to);
};

onMounted(async () => {
  const savedLang = localStorage.getItem("lang");
  if (savedLang) locale.value = savedLang;

  if (!productsStore.products.length) {
    await productsStore.fetchProducts(200, 0);
  }

  window.addEventListener("scroll", handleScroll);
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  document.body.style.overflow = "auto";
});

watch(
  () => route.fullPath,
  () => {
    searchQuery.value = "";
    langOpen.value = false;
    if (menuOpen.value) {
      menuOpen.value = false;
      document.body.style.overflow = "auto";
    }
  }
);
</script>

<template>
  <header>
    <nav
      class="brand-nav fixed left-0 top-0 w-full z-[999] transition-all duration-300"
      :class="isSticky ? 'nav-sticky' : 'nav-rest'"
    >
      <div class="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4 sm:gap-6">
        <RouterLink to="/" class="brand-logo-wrap flex-shrink-0" aria-label="Home">
          <span class="logo-halo" />
          <img
            src="/src/assets/images/logo.jpg"
            alt="Urganch Metan Service logo"
            class="brand-logo h-10 sm:h-12 md:h-14 w-auto max-w-[170px]"
          />
        </RouterLink>

        <div class="hidden xl:flex items-center gap-6 text-[15px] font-semibold text-slate-700">
          <RouterLink to="/" class="nav-link">{{ t("nav.main") }}</RouterLink>
          <RouterLink :to="{ path: '/', hash: '#contact' }" class="nav-link">{{ t("nav.contact") }}</RouterLink>
          <RouterLink to="/products" class="products-pill">{{ t("products.allProducts") }}</RouterLink>
        </div>

        <div class="hidden lg:flex items-center flex-1 max-w-md relative z-40">
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

        <div class="flex items-center gap-2 sm:gap-3 relative">
          <a href="https://t.me/metanservice" target="_blank" class="hidden sm:flex contact-chip">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              class="w-5 h-5"
            >
              <path
                d="M9.03 12.24l-.26 3.66c.37 0 .53-.16.73-.36l1.75-1.66 3.63 2.64c.67.37 1.16.18 1.33-.62l2.41-10.72c.22-.97-.35-1.35-1-1.12L3.86 9.78c-.94.36-.93.87-.16 1.1l3.57 1.12 8.27-5.2-5.51 5.44z"
              />
            </svg>
            <span class="hidden md:inline">{{ t("nav.contact_admin") || "Admin" }}</span>
          </a>

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

          <RouterLink to="/basket" class="basket-chip relative rounded-full p-2 text-slate-600 hover:text-slate-950">
            <div
              v-if="basketStore.basket.length"
              class="absolute right-0 top-0 bg-rose-600 rounded-full w-5 h-5 text-xs text-white font-bold flex justify-center items-center"
            >
              {{ basketStore.basket.length }}
            </div>
            <Basket :size="22" />
          </RouterLink>

          <button
            @click="toggleMenu"
            class="menu-toggle p-2 text-slate-700 hover:text-slate-950 xl:hidden"
            aria-label="Toggle menu"
          >
            <div class="space-y-1.5">
              <span class="block h-0.5 w-6 bg-current transition-transform" :class="{ 'rotate-45 translate-y-2': menuOpen }"></span>
              <span class="block h-0.5 w-6 bg-current transition-opacity" :class="{ 'opacity-0': menuOpen }"></span>
              <span class="block h-0.5 w-6 bg-current transition-transform" :class="{ '-rotate-45 -translate-y-2': menuOpen }"></span>
            </div>
          </button>
        </div>
      </div>
    </nav>

    <div
      v-if="menuOpen"
      class="xl:hidden fixed inset-0 pt-16 sm:pt-20 menu-overlay z-[998] overflow-y-auto"
    >
      <div class="container mx-auto px-4 py-6 space-y-6">
        <div class="relative mobile-card">
          <input
            v-model="searchQuery"
            type="search"
            :placeholder="t('nav.search_products') + '...'"
            class="w-full rounded-full border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <svg class="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                class="w-12 h-12 object-cover rounded-lg border border-gray-200"
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

        <div class="mobile-card grid gap-2 text-base font-semibold text-slate-700">
          <button class="mobile-link" @click="closeMenuAndGo({ name: 'Home' })">{{ t("nav.main") }}</button>
          <button class="mobile-link" @click="closeMenuAndGo({ path: '/', hash: '#contact' })">{{ t("nav.contact") }}</button>
          <button class="mobile-link" @click="closeMenuAndGo({ name: 'Products' })">{{ t("products.allProducts") }}</button>
        </div>

        <div class="mobile-card flex items-center gap-3 justify-between">
          <a href="https://t.me/metanservice" target="_blank" class="mobile-chip">
            {{ t("nav.contact_admin") || "Admin" }}
          </a>
          <button @click="closeMenuAndGo({ name: 'Basket' })" class="mobile-chip mobile-basket relative">
            <span v-if="basketStore.basket.length" class="mobile-basket-count">{{ basketStore.basket.length }}</span>
            {{ t("basket") }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.brand-nav {
  border-bottom: 1px solid rgba(20, 35, 56, 0.08);
  background: rgba(249, 250, 251, 0.86);
  backdrop-filter: blur(14px);
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

.menu-toggle {
  border-radius: 12px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.86);
}

.menu-overlay {
  background: rgba(245, 247, 250, 0.94);
  backdrop-filter: blur(12px);
}

.mobile-card {
  border-radius: 16px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
}

.mobile-link {
  text-align: left;
  border: 1px solid rgba(20, 35, 56, 0.1);
  border-radius: 12px;
  padding: 10px 12px;
  transition:
    color 0.2s,
    background-color 0.2s,
    transform 0.2s;
}

.mobile-link:hover {
  background: rgba(20, 35, 56, 0.04);
  color: #18304f;
  transform: translateX(2px);
}

.mobile-chip {
  cursor: pointer;
  border-radius: 999px;
  padding: 8px 12px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  font-weight: 600;
  color: #18304f;
  background: #ffffff;
}

.mobile-basket {
  background: #18304f;
  color: #fff;
  border-color: transparent;
  padding-right: 28px;
}

.mobile-basket-count {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
}
</style>
