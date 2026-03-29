import { createRouter, createWebHistory } from "vue-router";
import HomePage from "@/pages/HomePage.vue";
import { ref } from "vue";

export const isLoading = ref(false);

const DEFAULT_SEO = {
  title: "Urganch Metan Service - Metan Uskunalari va Servis",
  description:
    "Urganch Metan Service - O'zbekistonda metan uskunalari, texnik servis va ehtiyot qismlar bo'yicha ishonchli hamkor.",
  keywords:
    "Urganch Metan Service, metan service, metan uskunalari, metan servis, gaz uskunalari, CNG service, O'zbekiston",
  robots: "index,follow",
};

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomePage,
    meta: {
      title: "Urganch Metan Service - Bosh Sahifa",
      description:
        "Urganch Metan Service - metan uskunalari, texnik servis va ehtiyot qismlar bo'yicha professional xizmat.",
      keywords:
        "Urganch Metan Service, metan uskunalari, metan servis, gaz uskunalari",
    },
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/pages/AdminPage.vue"),
    meta: {
      title: "Urganch Metan Service - Admin",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/pages/LoginPage.vue"),
    meta: {
      title: "Urganch Metan Service - Login",
      robots: "noindex,nofollow",
      disableGlobalLoader: true,
    },
  },
  {
    path: "/register",
    name: "Register",
    component: () => import("@/pages/RegisterPage.vue"),
    meta: {
      title: "Urganch Metan Service - Register",
      robots: "noindex,nofollow",
      disableGlobalLoader: true,
    },
  },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: () => import("@/pages/ForgotPasswordPage.vue"),
    meta: {
      title: "Urganch Metan Service - Parolni tiklash",
      robots: "noindex,nofollow",
      disableGlobalLoader: true,
    },
  },
  {
    path: "/products",
    name: "Products",
    component: () => import("@/pages/ProductsPage.vue"),
    meta: {
      title: "Urganch Metan Service - Mahsulotlar",
      description:
        "Urganch Metan Service mahsulotlari: metan uskunalari, ehtiyot qismlar va servis uchun kerakli yechimlar.",
      keywords:
        "metan mahsulotlari, metan uskunalari narxi, CNG qismlar, Urganch Metan Service",
    },
  },
  {
    path: "/product/:id",
    name: "ProductDetail",
    component: () => import("@/pages/ProductDetail.vue"),
    meta: {
      title: "Urganch Metan Service - Mahsulot Tafsiloti",
      description:
        "Urganch Metan Service mahsulot tafsilotlari va texnik ma'lumotlari.",
      keywords:
        "metan mahsulot tafsiloti, metan uskunasi, Urganch Metan Service",
    },
  },
  {
    path: "/basket",
    name: "Basket",
    component: () => import("@/pages/BasketPage.vue"),
    meta: {
      title: "Urganch Metan Service - Savat",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/pages/NotFoundPage.vue"),
    meta: {
      title: "Urganch Metan Service - Sahifa Topilmadi",
      robots: "noindex,nofollow",
    },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else if (to.hash) {
      const el = document.querySelector(to.hash);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 82;
        return { top, behavior: "smooth" };
      }
    }
    return { top: 0, behavior: "smooth" };
  },
});

// Router guards
router.beforeEach((to, from, next) => {
  isLoading.value = true;
  next();
});

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let metaTag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!metaTag) {
    metaTag = document.createElement("meta");
    metaTag.setAttribute(attr, key);
    document.head.appendChild(metaTag);
  }
  metaTag.setAttribute("content", content);
};

const applySeo = (seo) => {
  document.title = seo.title;
  upsertMeta("name", "description", seo.description);
  upsertMeta("name", "keywords", seo.keywords);
  upsertMeta("name", "robots", seo.robots);
  upsertMeta("property", "og:title", seo.title);
  upsertMeta("property", "og:description", seo.description);
  upsertMeta("name", "twitter:title", seo.title);
  upsertMeta("name", "twitter:description", seo.description);
};

router.afterEach((to) => {
  const seo = {
    ...DEFAULT_SEO,
    ...(to.meta || {}),
  };
  applySeo(seo);

  // Keyingi tick’da ishlasin → import yuklanib bo‘ladi
  setTimeout(() => {
    isLoading.value = false;
  }, 300);
});

router.onError((error) => {
  const message = String(error?.message || "");
  const isChunkLoadError =
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("Unable to preload CSS");

  if (isChunkLoadError && typeof window !== "undefined") {
    window.location.reload();
  }
});

export default router;
