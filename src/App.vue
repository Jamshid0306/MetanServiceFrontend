<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import Nav from "./components/Nav.vue";
import Loader from "./components/Loader.vue";
import { useLoaderStore } from "./store/loaderStore";
import { useBasketStore } from "./store/basketStore";
import InstagramIcon from "./components/icons/InstagramIcon.vue";
import Footer from "./components/Footer.vue";
import {
  CONTACT_INSTAGRAM_HANDLE,
  CONTACT_INSTAGRAM_URL,
  CONTACT_MAP_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
} from "./constants/contact";
import {
  clearCustomerSession,
  getStoredCustomerSession,
} from "./lib/customerSession";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const expanded = ref(false);
const loaderStore = useLoaderStore();
const basketStore = useBasketStore();
const customerProfile = ref(null);

onMounted(() => {
  customerProfile.value = getStoredCustomerSession();

  if (typeof window !== "undefined") {
    window.addEventListener("storage", syncCustomerProfile);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("storage", syncCustomerProfile);
  }
});

const syncCustomerProfile = () => {
  customerProfile.value = getStoredCustomerSession();
};

const toggleExpand = () => {
  expanded.value = !expanded.value;
};

const toggleProfile = () => {
  syncCustomerProfile();

  if (!customerProfile.value) {
    router.push("/login");
    return;
  }

  router.push("/profile");
};

const logoutCustomer = () => {
  clearCustomerSession();
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("customer_access_token");
  }
  syncCustomerProfile();
  router.push("/login");
};

const profileDisplayName = computed(() => {
  const name = String(customerProfile.value?.name || "").trim();
  if (!name) {
    return t("nav.login");
  }

  const [firstWord] = name.split(/\s+/);
  return firstWord || name;
});

const profileSecondaryText = computed(() => {
  const phone = String(customerProfile.value?.phone || "").trim();
  if (phone) {
    return `+${phone}`;
  }
  return t("auth.userAccess");
});

const isHomeRoute = computed(() => route.path === "/" && route.hash !== "#contact");
const isProductsRoute = computed(
  () => route.path.startsWith("/products") || route.path.startsWith("/product")
);
const isBasketRoute = computed(() => route.path.startsWith("/basket"));
const isProfileRoute = computed(() => route.path.startsWith("/profile"));
const isCheckoutRoute = computed(() => route.path.startsWith("/checkout"));
const basketCount = computed(() => basketStore.basket.length);
const isAuthRoute = computed(() =>
  ["Login", "Register", "ForgotPassword"].includes(String(route.name || ""))
);
const isLoaderDisabledRoute = computed(() => Boolean(route.meta?.disableGlobalLoader));
const showPublicLayout = computed(
  () => route.path !== "/admin" && !isAuthRoute.value
);
const showPublicExtras = computed(
  () => showPublicLayout.value && !isAuthRoute.value && !isCheckoutRoute.value
);
const showLoader = computed(
  () => loaderStore.loader && !isAuthRoute.value && !isLoaderDisabledRoute.value
);

watch(
  () => route.fullPath,
  () => {
    expanded.value = false;
    syncCustomerProfile();
  }
);
</script>


<template>
  <div>
    <div
      v-if="showPublicLayout"
      class="app-nav-shell"
      :class="{ 'app-nav-shell-mobile-hidden': !isHomeRoute }"
    >
      <Nav />
    </div>
    <RouterView />
    <Footer v-if="showPublicExtras" />
    <Loader v-if="showLoader" />

    <div v-if="showPublicExtras" class="app-mobile-dock lg:hidden">
      <div class="app-mobile-dock-inner">
        <RouterLink
          to="/"
          class="app-mobile-dock-link"
          :class="{ 'app-mobile-dock-link-active': isHomeRoute }"
        >
          <svg class="app-mobile-dock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 10.5L12 3l9 7.5M5.25 9.75V21h13.5V9.75" />
          </svg>
          <span>{{ t("nav.main") }}</span>
        </RouterLink>

        <RouterLink
          to="/products"
          class="app-mobile-dock-link"
          :class="{ 'app-mobile-dock-link-active': isProductsRoute }"
        >
          <svg class="app-mobile-dock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 7.5h16M4 12h16M4 16.5h16" />
          </svg>
          <span>{{ t("products.allProducts") }}</span>
        </RouterLink>

        <RouterLink
          to="/basket"
          class="app-mobile-dock-link app-mobile-dock-link-basket"
          :class="{ 'app-mobile-dock-link-active': isBasketRoute }"
        >
          <span v-if="basketCount" class="app-mobile-dock-badge">{{ basketCount }}</span>
          <svg class="app-mobile-dock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M3.75 4.5h1.386c.51 0 .955.343 1.086.836L6.75 7.5m0 0h11.94c.83 0 1.45.78 1.271 1.59l-1.02 4.5a1.29 1.29 0 0 1-1.271 1.01H9.072a1.29 1.29 0 0 1-1.271-1.01L6.75 7.5Zm2.25 10.5a.75.75 0 1 1 0 1.5a.75.75 0 0 1 0-1.5Zm9 0a.75.75 0 1 1 0 1.5a.75.75 0 0 1 0-1.5Z"
            />
          </svg>
          <span>{{ t("basket") }}</span>
        </RouterLink>

        <button
          type="button"
          class="app-mobile-dock-link app-mobile-dock-link-profile"
          :class="{ 'app-mobile-dock-link-active': isProfileRoute }"
          @click="toggleProfile"
        >
          <span class="app-mobile-dock-profile-avatar">
            <svg
              v-if="!customerProfile"
              class="app-mobile-dock-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M15.75 6.75a3.75 3.75 0 1 1-7.5 0a3.75 3.75 0 0 1 7.5 0ZM4.5 20.12a7.5 7.5 0 0 1 15 0"
              />
            </svg>
            <span v-else>{{ profileDisplayName.charAt(0).toUpperCase() }}</span>
          </span>
          <span>{{ profileDisplayName }}</span>
        </button>
      </div>
    </div>

    <div v-if="showPublicExtras" class="quick-contact">
      <transition name="contact-panel">
        <div v-if="expanded" class="contact-panel">
          <p class="contact-panel-title">Urganch Metan Service</p>
          <p class="contact-panel-subtitle">Support xizmati</p>

          <a
            :href="CONTACT_PHONE_HREF"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-phone">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M19.95 21q-3.125 0-6.175-1.35t-5.475-3.775t-3.775-5.475T3.175 4.225q0-.45.3-.75t.75-.3H8.1q.375 0 .688.25t.387.625l.6 2.725q.075.4-.025.675t-.35.525L7.05 10.3q.575 1.025 1.313 1.95T10 14q.825.825 1.75 1.563t1.95 1.312l2.325-2.35q.25-.25.55-.338t.625-.012l2.7.55q.4.075.65.388t.25.687v3.875q0 .45-.3.75t-.75.3"
                />
              </svg>
            </span>
            <span class="contact-link-text">
              <strong>{{ t("phone") }}</strong>
              <small>{{ CONTACT_PHONE_DISPLAY }}</small>
            </span>
          </a>

          <a
            :href="CONTACT_INSTAGRAM_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-inst">
              <InstagramIcon />
            </span>
            <span class="contact-link-text">
              <strong>Instagram</strong>
              <small>{{ CONTACT_INSTAGRAM_HANDLE }}</small>
            </span>
          </a>

          <a
            :href="CONTACT_MAP_URL"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-map">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M12 22q-.425 0-.712-.288T11 21q0-.125.075-.425t.2-.7t.287-.85t.338-.925q-2.5-.225-4.2-2.062T6 11.8q0-2.5 1.75-4.15T12 6q2.5 0 4.25 1.65T18 11.8q0 1.875-.9 3.438T14.725 17.7q.15.35.3.725t.275.725t.2.65T15.6 20q0 .425-.288.713T14.6 21q-.25 0-.463-.137t-.337-.363q-.625-1.35-.987-2.175t-.813-1.825q-.45 1-.813 1.825t-.987 2.175q-.125.225-.338.363T9.4 21q-.425 0-.712-.287T8.4 20q0-.1.1-.412t.25-.738t.325-.85t.325-.725q-1.5-.75-2.45-2.137T6 11.8Q6 9.3 7.75 7.65T12 6q2.5 0 4.25 1.65T18 11.8q0 2.238-1.387 3.987T13 18.1q.175.45.338.925t.287.85t.2.7t.075.425q0 .425-.287.713T13 22z"
                />
              </svg>
            </span>
            <span class="contact-link-text">
              <strong>{{ t("footer.contact") }}</strong>
              <small>{{ t("footer.address") }}</small>
            </span>
          </a>
        </div>
      </transition>

      <button
        @click="toggleExpand"
        :aria-expanded="expanded"
        aria-label="Toggle quick contacts"
        class="quick-toggle"
      >
        <span class="quick-toggle-icon">
          <svg
            v-if="!expanded"
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2m5.56 7.16l-1.5 7.08a1.18 1.18 0 0 1-1.74.8l-2.41-1.77l-1.17 1.14c-.13.13-.23.23-.48.23l.17-2.43l4.43-4c.19-.17-.04-.27-.29-.1l-5.47 3.45l-2.36-.74c-.51-.16-.52-.51.11-.76l9.24-3.56c.42-.19.82.1.67.66"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="m8.382 17.025l-1.407-1.4L10.593 12L6.975 8.4L8.382 7L12 10.615L15.593 7L17 8.4L13.382 12L17 15.625l-1.407 1.4L12 13.41z"
            />
          </svg>
        </span>
        <span class="quick-toggle-text">{{ expanded ? "Close" : "Contact" }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 1023px) {
  .app-nav-shell-mobile-hidden {
    display: none;
  }
}

.app-mobile-dock {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 997;
  padding: 0 0.75rem calc(0.75rem + env(safe-area-inset-bottom));
  pointer-events: none;
}

.app-mobile-dock-inner {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.35rem;
  align-items: stretch;
  width: min(100%, 540px);
  margin: 0 auto;
  padding: 0.45rem;
  border: 1px solid rgba(20, 35, 56, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(18px);
  box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.1);
}

.app-mobile-dock-link {
  position: relative;
  min-width: 0;
  min-height: 58px;
  padding: 0.45rem 0.35rem;
  border-radius: 18px;
  color: #576779;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  text-align: center;
  line-height: 1.1;
  font-size: 0.7rem;
  font-weight: 700;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.app-mobile-dock-link:hover {
  color: #18304f;
  background: rgba(20, 35, 56, 0.05);
}

.app-mobile-dock-link-active {
  color: #18304f;
  background: rgba(20, 48, 79, 0.08);
}

.app-mobile-dock-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.app-mobile-dock-badge {
  position: absolute;
  top: 0.38rem;
  right: 0.48rem;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: #18304f;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.64rem;
  font-weight: 800;
  line-height: 1;
}

.app-mobile-dock-link-profile {
  gap: 0.24rem;
}

.app-mobile-dock-profile-avatar {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: rgba(20, 48, 79, 0.1);
  color: #18304f;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  line-height: 1;
}

.mobile-profile-panel {
  pointer-events: auto;
  width: min(100%, 540px);
  margin: 0 auto 0.55rem;
  border: 1px solid rgba(20, 35, 56, 0.12);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(18px);
  padding: 0.85rem;
}

.mobile-profile-head {
  display: flex;
  align-items: center;
  gap: 0.72rem;
}

.mobile-profile-avatar {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  background: linear-gradient(135deg, #18304f 0%, #365c87 100%);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.mobile-profile-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.mobile-profile-copy strong {
  color: #142338;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.2;
}

.mobile-profile-copy small {
  margin-top: 0.12rem;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-profile-meta {
  display: grid;
  gap: 0.4rem;
  margin-top: 0.8rem;
}

.mobile-profile-meta p {
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.65rem 0.8rem;
  border-radius: 14px;
  background: #f6f8fb;
}

.mobile-profile-meta span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
}

.mobile-profile-meta strong {
  color: #142338;
  font-size: 0.82rem;
  font-weight: 800;
  text-align: right;
  word-break: break-word;
}

.mobile-profile-logout {
  width: 100%;
  margin-top: 0.8rem;
  min-height: 44px;
  border-radius: 16px;
  border: 1px solid rgba(20, 48, 79, 0.14);
  background: #18304f;
  color: #fff;
  font-size: 0.84rem;
  font-weight: 800;
}

.mobile-profile-orders {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 0.65rem;
  min-height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(20, 48, 79, 0.14);
  background: #ffffff;
  color: #18304f;
  font-size: 0.84rem;
  font-weight: 800;
}

.mobile-profile-orders + .mobile-profile-logout {
  margin-top: 0.55rem;
}

.quick-contact {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.65rem;
}

.quick-toggle {
  border: 1px solid rgba(20, 35, 56, 0.14);
  background: rgba(255, 255, 255, 0.92);
  color: #18304f;
  border-radius: 999px;
  min-width: 128px;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  font-weight: 700;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.quick-toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(20, 35, 56, 0.2);
  background: #ffffff;
}

.quick-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.quick-toggle-text {
  letter-spacing: 0.01em;
}

.contact-panel {
  width: min(280px, calc(100vw - 2.5rem));
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(10px);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  padding: 0.82rem;
}

.contact-panel-title {
  color: #142338;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.contact-panel-subtitle {
  margin-top: 0.22rem;
  margin-bottom: 0.72rem;
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 600;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: 12px;
  padding: 0.48rem;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.contact-link + .contact-link {
  margin-top: 0.25rem;
}

.contact-link:hover {
  background: rgba(20, 35, 56, 0.04);
  transform: translateX(1px);
}

.contact-link-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #142338;
  flex-shrink: 0;
}

.contact-link-icon-phone {
  background: #eef2f6;
}

.contact-link-icon-inst {
  background: #eef2f6;
}

.contact-link-icon-map {
  background: #eef2f6;
}

.contact-link-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  color: #142338;
}

.contact-link-text strong {
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.2;
}

.contact-link-text small {
  margin-top: 1px;
  font-size: 0.72rem;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-panel-enter-active,
.contact-panel-leave-active {
  transition: all 0.25s ease;
}

.contact-panel-enter-from,
.contact-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 640px) {
  .app-mobile-dock {
    padding-inline: 0.55rem;
  }

  .app-mobile-dock-inner {
    gap: 0.2rem;
    padding: 0.35rem;
    border-radius: 22px;
  }

  .app-mobile-dock-link {
    min-height: 54px;
    font-size: 0.65rem;
  }

  .app-mobile-dock-badge {
    top: 0.32rem;
    right: 0.32rem;
  }

  .quick-contact {
    right: 0.9rem;
    bottom: 0.9rem;
  }

  .quick-toggle {
    min-width: 112px;
    height: 2.85rem;
    font-size: 0.84rem;
  }
}

@media (max-width: 1023px) {
  .quick-contact {
    display: none;
  }
}
</style>
