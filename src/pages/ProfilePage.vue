<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import uzFlag from "@/assets/images/uz.png";
import ruFlag from "@/assets/images/ru.png";
import { apiClient, getApiErrorMessage } from "@/lib/api";

import {
  CUSTOMER_SESSION_EVENT,
  formatCustomerPhone,
  getStoredCustomerAccessToken,
  getStoredCustomerSession,
  storeCustomerSession,
} from "@/lib/customerSession";

const router = useRouter();
const { t, locale } = useI18n();

const customerSession = ref(null);
const profileLoading = ref(false);
const profileError = ref("");
const languageOpen = ref(false);
const languages = [
  { code: "uz", label: "Uzbek", flag: uzFlag },
  { code: "ru", label: "Russkiy", flag: ruFlag },
];
const activeLanguage = computed(
  () => languages.find((lang) => lang.code === locale.value) || languages[0]
);

const syncCustomerSession = () => {
  customerSession.value = getStoredCustomerSession();
};

const customerAddress = computed(() =>
  String(customerSession.value?.address || "").trim()
);
const customerInitial = computed(
  () => String(customerSession.value?.name || "U").trim().charAt(0).toUpperCase() || "U"
);
const customerPhoneDisplay = computed(() =>
  formatCustomerPhone(customerSession.value?.phone || "")
);

const purchaseMenuItems = computed(() => [
  {
    key: "orders",
    label: t("profile.orders"),
    icon: "bag",
    action: () => router.push("/profile/orders"),
  },
  {
    key: "favorites",
    label: t("profile.favorites"),
    icon: "heart",
    action: () => router.push("/profile/favorites"),
  },
]);

const changeLanguage = (lang) => {
  locale.value = lang;
  languageOpen.value = false;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("lang", lang);
  }
};

const loadCustomerProfile = async () => {
  const accessToken = getStoredCustomerAccessToken();
  if (!accessToken) {
    return;
  }

  profileLoading.value = true;
  profileError.value = "";

  try {
    const response = await apiClient.get("/customers/me", {
      skipAuth: true,
      skipAuthRefresh: true,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    customerSession.value = response.data || null;
    storeCustomerSession(response.data || null);
  } catch (error) {
    profileError.value = getApiErrorMessage(error, t("profile.loadError"));
  } finally {
    profileLoading.value = false;
  }
};

onMounted(async () => {
  syncCustomerSession();
  if (!customerSession.value && !getStoredCustomerAccessToken()) {
    router.push("/login");
    return;
  }

  await loadCustomerProfile();

  if (typeof window !== "undefined") {
    window.addEventListener(CUSTOMER_SESSION_EVENT, syncCustomerSession);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener(CUSTOMER_SESSION_EVENT, syncCustomerSession);
  }
});
</script>

<template>
  <main class="profile-page">
    <section class="profile-hero">
      <div class="profile-avatar">
        <span>{{ customerInitial }}</span>
      </div>
      <div class="profile-hero-copy">
        <strong>{{ customerSession?.name || t("nav.login") }}</strong>
        <span>{{ customerPhoneDisplay || "+998" }}</span>
        <small>{{ customerAddress || "-" }}</small>
      </div>
    </section>

    <p v-if="profileLoading" class="profile-status">{{ t("profile.loading") }}</p>
    <p v-if="profileError" class="profile-status profile-status-error">{{ profileError }}</p>

    <section class="profile-section">
      <h2>{{ t("profile.purchases") }}</h2>
      <div class="profile-menu-card">
        <button
          v-for="item in purchaseMenuItems"
          :key="item.key"
          type="button"
          class="profile-menu-row"
          @click="item.action"
        >
          <span class="profile-menu-icon">
            <svg v-if="item.icon === 'bag'" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 8V7a5 5 0 0 1 10 0v1h2l1 12H4L5 8h2Zm2 0h6V7a3 3 0 0 0-6 0v1Zm-2.15 2-.67 8h11.64l-.67-8H6.85Z" />
            </svg>
            <svg v-else-if="item.icon === 'return'" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8.5 7.5 5 11l3.5 3.5 1.4-1.4L8.8 12H15a4 4 0 1 1 0 8h-4v2h4a6 6 0 1 0 0-12H8.8l1.1-1.1-1.4-1.4Z" />
            </svg>
            <svg v-else-if="item.icon === 'heart'" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s-7.5-4.7-9.6-9.2C.9 8.5 2.9 5 6.4 5c2 0 3.4 1.1 4.1 2.2C11.2 6.1 12.6 5 14.6 5c3.5 0 5.5 3.5 4 6.8C16.5 16.3 12 21 12 21Zm0-2.5c2.4-1.7 5.7-5 6.7-7.5.9-2-.2-4-2.3-4-1.7 0-2.8 1.2-3.5 2.4h-1.8C10.4 8.2 9.3 7 7.6 7 5.5 7 4.4 9 5.3 11c1 2.5 4.3 5.8 6.7 7.5Z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8 9.5a1.2 1.2 0 1 1 2.4 0A1.2 1.2 0 0 1 8 9.5Zm5.6 0a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0ZM8.2 14h7.6a4 4 0 0 1-7.6 0Z" />
            </svg>
          </span>
          <span>{{ item.label }}</span>
          <span class="profile-menu-chevron">›</span>
        </button>
      </div>
    </section>

    <section class="profile-section">
      <h2>{{ t("profile.aboutMe") }}</h2>
      <div class="profile-menu-card">
        <div class="profile-language" :class="{ 'profile-language-open': languageOpen }">
          <button
            type="button"
            class="profile-menu-row profile-language-toggle"
            @click="languageOpen = !languageOpen"
          >
            <span class="profile-menu-icon">
              <img :src="activeLanguage.flag" alt="" />
            </span>
            <span>
              {{ t("profile.language") }}
              <small>{{ activeLanguage.label }}</small>
            </span>
            <span class="profile-menu-chevron">›</span>
          </button>

          <div v-if="languageOpen" class="profile-language-dropdown">
            <button
              v-for="lang in languages"
              :key="lang.code"
              type="button"
              class="profile-language-option"
              :class="{ 'profile-language-option-active': locale === lang.code }"
              @click="changeLanguage(lang.code)"
            >
              <img :src="lang.flag" alt="" />
              <span>{{ lang.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  max-width: 720px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 132px 14px 92px;
  background: #f7f7f8;
}

.profile-hero,
.profile-section {
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.profile-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
}

.profile-avatar {
  flex: 0 0 58px;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1;
}

.profile-hero-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.profile-hero-copy strong {
  color: #111827;
  font-size: 1rem;
  font-weight: 900;
}

.profile-hero-copy span {
  color: #9ca3af;
  font-size: 0.9rem;
  font-weight: 800;
}

.profile-hero-copy small {
  display: block;
  max-width: 100%;
  color: #6b7280;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-word;
}

.profile-status {
  margin: 10px 4px 0;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 700;
}

.profile-status-error {
  color: #dc2626;
}

.profile-section {
  margin-top: 16px;
  padding: 18px 14px;
}

.profile-section h2 {
  margin: 0 0 12px;
  color: #111827;
  font-size: 1.25rem;
  font-weight: 900;
}

.profile-menu-card {
  position: relative;
  overflow: visible;
  border-radius: 8px;
  background: #f5f5f9;
}

.profile-menu-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  border: 0;
  border-bottom: 1px solid rgba(226, 232, 240, 0.65);
  background: transparent;
  padding: 0 12px;
  color: #2f3440;
  text-align: left;
  font-weight: 800;
  font-size: 0.92rem;
}

.profile-menu-row:last-child {
  border-bottom: 0;
}

.profile-menu-row:hover {
  background: #eef2f7;
}

.profile-menu-row-static {
  cursor: default;
}

.profile-menu-icon {
  display: grid;
  place-items: center;
  color: #9ca3af;
}

.profile-menu-icon svg,
.profile-menu-icon img {
  width: 22px;
  height: 22px;
}

.profile-menu-icon svg {
  fill: currentColor;
}

.profile-menu-icon img {
  border-radius: 4px;
  object-fit: cover;
}

.profile-menu-row small {
  display: block;
  max-width: 100%;
  margin-top: 2px;
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-menu-chevron {
  color: #c7cbd1;
  font-size: 1.35rem;
  line-height: 1;
  text-align: right;
}

.profile-language {
  position: relative;
}

.profile-language-open {
  margin-bottom: 78px;
}

.profile-language-toggle {
  border-bottom: 0;
}

.profile-language-dropdown {
  position: absolute;
  left: 44px;
  right: 10px;
  top: calc(100% + 4px);
  z-index: 20;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
}

.profile-language-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  border: 0;
  background: transparent;
  padding: 7px 10px;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 700;
  text-align: left;
}

.profile-language-option img {
  width: 18px;
  height: 18px;
  border-radius: 3px;
  object-fit: cover;
}

.profile-language-option:hover,
.profile-language-option-active {
  background: #f1f5f9;
  color: #0f172a;
}

@media (max-width: 720px) {
  .profile-page {
    padding-top: 122px;
  }
}
</style>
