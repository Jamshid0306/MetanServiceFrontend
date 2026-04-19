import { createRouter, createWebHistory } from "vue-router";
import HomePage from "@/pages/HomePage.vue";
import { ref } from "vue";

export const isLoading = ref(false);

const SITE_URL = "https://urganch-metan-servis.uz";
const SITE_NAME = "Urganch Metan Service";
const DEFAULT_IMAGE = `${SITE_URL}/site-logo.png`;

const DEFAULT_SEO = {
  title: "Urganch Metan Service - Metan Uskunalari va Servis",
  description:
    "Urganch Metan Service - Xorazm va O'zbekistonda metan uskunalari, CNG ehtiyot qismlar, o'rnatish va texnik servis bo'yicha ishonchli hamkor.",
  keywords:
    "Urganch Metan Service, metan service, metan uskunalari, metan servis, gaz uskunalari, CNG service, CNG ehtiyot qismlar, metan o'rnatish, Xorazm, Urganch, O'zbekiston",
  robots: "index,follow",
  image: DEFAULT_IMAGE,
  type: "website",
};

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomePage,
    meta: {
      title: "Urganch Metan Service - Bosh Sahifa",
      description:
        "Urganch Metan Service - Urganchda metan uskunalari, CNG ehtiyot qismlar, texnik servis, o'rnatish va qo'llab-quvvatlash xizmatlari.",
      keywords:
        "Urganch Metan Service, Urganch metan servis, metan uskunalari, CNG servis, gaz uskunalari, metan o'rnatish",
      canonicalPath: "/",
    },
  },
  {
    path: "/admin",
    name: "Admin",
    component: () => import("@/pages/AdminPage.vue"),
    meta: {
      title: "Urganch Metan Service - Admin",
      description: "Urganch Metan Service admin paneli.",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("@/pages/LoginPage.vue"),
    meta: {
      title: "Urganch Metan Service - Login",
      description: "Urganch Metan Service mijoz kabinetiga kirish sahifasi.",
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
      description: "Urganch Metan Service mijoz kabineti uchun ro'yxatdan o'tish sahifasi.",
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
      description: "Urganch Metan Service akkaunti parolini tiklash sahifasi.",
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
        "Urganch Metan Service katalogi: metan uskunalari, CNG ehtiyot qismlar, gaz ballon tizimlari va servis uchun kerakli mahsulotlar.",
      keywords:
        "metan mahsulotlari, metan uskunalari narxi, CNG qismlar, gaz ballon uskunalari, metan ehtiyot qismlar, Urganch Metan Service",
      canonicalPath: "/products",
    },
  },
  {
    path: "/product/:id",
    name: "ProductDetail",
    component: () => import("@/pages/ProductDetail.vue"),
    meta: {
      title: "Urganch Metan Service - Mahsulot Tafsiloti",
      description:
        "Urganch Metan Service mahsulot tafsilotlari: narx, xususiyatlar, muddatli to'lov va buyurtma ma'lumotlari.",
      keywords:
        "metan mahsulot tafsiloti, metan uskunasi, CNG ehtiyot qism, gaz uskunasi, Urganch Metan Service",
      type: "product",
    },
  },
  {
    path: "/basket",
    name: "Basket",
    component: () => import("@/pages/BasketPage.vue"),
    meta: {
      title: "Urganch Metan Service - Savat",
      description: "Urganch Metan Service savati: tanlangan mahsulotlarni ko'rish va buyurtmaga o'tish.",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/checkout",
    name: "Checkout",
    component: () => import("@/pages/CheckoutPage.vue"),
    meta: {
      title: "Urganch Metan Service - Buyurtmani rasmiylashtirish",
      description: "Urganch Metan Service buyurtmani rasmiylashtirish va CLICK yoki muddatli to'lov orqali xarid qilish sahifasi.",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/profile",
    name: "Profile",
    component: () => import("@/pages/ProfilePage.vue"),
    meta: {
      title: "Urganch Metan Service - Profil",
      description: "Urganch Metan Service mijoz profili.",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/profile/orders",
    name: "ProfileOrders",
    component: () => import("@/pages/ProfileOrdersPage.vue"),
    meta: {
      title: "Urganch Metan Service - Buyurtmalarim",
      description: "Urganch Metan Service mijoz buyurtmalari va to'lov holatlari sahifasi.",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/profile/favorites",
    name: "ProfileFavorites",
    component: () => import("@/pages/ProfileFavoritesPage.vue"),
    meta: {
      title: "Urganch Metan Service - Sevimlilar",
      description: "Urganch Metan Service sevimli mahsulotlar ro'yxati.",
      robots: "noindex,nofollow",
    },
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/pages/NotFoundPage.vue"),
    meta: {
      title: "Urganch Metan Service - Sahifa Topilmadi",
      description: "So'ralgan sahifa topilmadi.",
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

const upsertLink = (rel, href) => {
  if (!href) return;
  let linkTag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!linkTag) {
    linkTag = document.createElement("link");
    linkTag.setAttribute("rel", rel);
    document.head.appendChild(linkTag);
  }
  linkTag.setAttribute("href", href);
};

const removeMeta = (attr, key) => {
  const metaTag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (metaTag) metaTag.remove();
};

const normalizePathForCanonical = (to, seo) => {
  const explicitPath = seo.canonicalPath;
  if (typeof explicitPath === "function") {
    return explicitPath(to);
  }
  if (typeof explicitPath === "string") {
    return explicitPath;
  }
  return to.path || "/";
};

const buildCanonicalUrl = (to, seo) => {
  const path = normalizePathForCanonical(to, seo);
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

const applySeo = (seo, to) => {
  const canonicalUrl = buildCanonicalUrl(to, seo);
  const imageUrl = seo.image || DEFAULT_IMAGE;
  const localeCode = String(localStorage.getItem("lang") || "uz").toLowerCase();

  document.documentElement.setAttribute("lang", localeCode === "ru" ? "ru" : "uz");
  document.title = seo.title;
  upsertMeta("name", "description", seo.description);
  upsertMeta("name", "keywords", seo.keywords);
  upsertMeta("name", "robots", seo.robots);
  upsertMeta("name", "author", SITE_NAME);
  upsertMeta("name", "application-name", SITE_NAME);
  upsertMeta("name", "theme-color", "#18304f");

  upsertMeta("property", "og:site_name", SITE_NAME);
  upsertMeta("property", "og:locale", localeCode === "ru" ? "ru_RU" : "uz_UZ");
  upsertMeta("property", "og:type", seo.type || "website");
  upsertMeta("property", "og:url", canonicalUrl);
  upsertMeta("property", "og:title", seo.title);
  upsertMeta("property", "og:description", seo.description);
  upsertMeta("property", "og:image", imageUrl);
  upsertMeta("property", "og:image:alt", seo.imageAlt || seo.title);

  upsertMeta("name", "twitter:card", "summary_large_image");
  upsertMeta("name", "twitter:title", seo.title);
  upsertMeta("name", "twitter:description", seo.description);
  upsertMeta("name", "twitter:image", imageUrl);
  upsertMeta("name", "twitter:image:alt", seo.imageAlt || seo.title);

  if (seo.robots === "noindex,nofollow") {
    removeMeta("name", "googlebot");
  } else {
    upsertMeta("name", "googlebot", "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1");
  }

  upsertLink("canonical", canonicalUrl);
};

router.afterEach((to) => {
  const seo = {
    ...DEFAULT_SEO,
    ...(to.meta || {}),
  };
  applySeo(seo, to);

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
