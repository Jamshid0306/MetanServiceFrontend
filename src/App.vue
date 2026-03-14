<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import Nav from "./components/Nav.vue";
import Loader from "./components/Loader.vue";
import { useLoaderStore } from "./store/loaderStore";
import { useBasketStore } from "./store/basketStore";
import FaceBookIcon from "./components/icons/FaceBookIcon.vue";
import InstagramIcon from "./components/icons/InstagramIcon.vue";
import Footer from "./components/Footer.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const expanded = ref(false);
const loaderStore = useLoaderStore();
const basketStore = useBasketStore();

onMounted(() => {
  loaderStore.loader = true;
});

const toggleExpand = () => {
  expanded.value = !expanded.value;
};

const isHomeRoute = computed(() => route.path === "/" && route.hash !== "#contact");
const isProductsRoute = computed(
  () => route.path.startsWith("/products") || route.path.startsWith("/product")
);
const isContactRoute = computed(
  () => route.path === "/" && route.hash === "#contact"
);
const isBasketRoute = computed(() => route.path.startsWith("/basket"));
const basketCount = computed(() => basketStore.basket.length);

const goToContact = () => {
  router.push({ path: "/", hash: "#contact" });
};

watch(
  () => route.fullPath,
  () => {
    expanded.value = false;
  }
);
</script>

<template>
  <div>
    <Nav v-if="route.path !== '/admin'" />
    <RouterView />
    <Footer v-if="route.path !== '/admin'" />
    <Loader v-if="loaderStore.loader" />

    <div v-if="route.path !== '/admin'" class="app-mobile-dock lg:hidden">
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
          class="app-mobile-dock-link"
          :class="{ 'app-mobile-dock-link-active': isContactRoute }"
          @click="goToContact"
        >
          <svg class="app-mobile-dock-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2m18 0v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8m18 0l-9 6-9-6" />
          </svg>
          <span>{{ t("nav.contact") }}</span>
        </button>
      </div>
    </div>

    <div v-if="route.path !== '/admin'" class="quick-contact">
      <transition name="contact-panel">
        <div v-if="expanded" class="contact-panel">
          <p class="contact-panel-title">Urganch Metan Service</p>
          <p class="contact-panel-subtitle">Support xizmati</p>

          <a
            href="https://t.me/metanservice"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-tg">
              <FaceBookIcon />
            </span>
            <span class="contact-link-text">
              <strong>Telegram</strong>
              <small>Official channel</small>
            </span>
          </a>

          <a
            href="https://www.instagram.com/metanservice/"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-inst">
              <InstagramIcon />
            </span>
            <span class="contact-link-text">
              <strong>Instagram</strong>
              <small>Official page</small>
            </span>
          </a>

          <a
            href="https://www.facebook.com/profile.php?id=61579837593638"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-fb">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396z"
                />
              </svg>
            </span>
            <span class="contact-link-text">
              <strong>Facebook</strong>
              <small>Official page</small>
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

.contact-link-icon-tg {
  background: #eef2f6;
}

.contact-link-icon-inst {
  background: #eef2f6;
}

.contact-link-icon-fb {
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
