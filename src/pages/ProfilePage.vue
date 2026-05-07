<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import uzFlag from "@/assets/images/uz.png";
import ruFlag from "@/assets/images/ru.png";
import { apiClient, getApiErrorMessage } from "@/lib/api";

import {
  CUSTOMER_SESSION_EVENT,
  clearCustomerSession,
  formatCustomerPhone,
  getStoredCustomerAccessToken,
  getStoredCustomerSession,
  normalizeCustomerPhone,
  storeCustomerSession,
} from "@/lib/customerSession";

const router = useRouter();
const { t, locale } = useI18n();

const customerSession = ref(null);
const profileLoading = ref(false);
const profileError = ref("");
const languageOpen = ref(false);
const orderStatusBadge = ref(null);
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
    badge: orderStatusBadge.value,
    action: () => router.push("/profile/orders"),
  },
  {
    key: "favorites",
    label: t("profile.favorites"),
    icon: "heart",
    action: () => router.push("/profile/favorites"),
  },
]);

const orderBadgeStorageKey = computed(() => {
  const phone = normalizeCustomerPhone(customerSession.value?.phone || "");
  return phone ? `profile_order_status_badge:${phone}` : "";
});

const getCustomerStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

const pendingOrderStatuses = new Set([
  "created",
  "draft",
  "in_process",
  "in_progress",
  "jarayonda",
  "new",
  "on_review",
  "pending",
  "prepared",
  "process",
  "processing",
  "review",
  "under_review",
]);

const successfulOrderStatuses = new Set([
  "active",
  "approved",
  "completed",
  "success",
  "successful",
  "succeed",
  "succeeded",
  "suceed",
  "suceeded",
]);

const cancelledOrderStatuses = new Set([
  "canceled",
  "cancelled",
  "rejected",
  "refused",
]);

const orderIsInstallment = (order = {}) =>
  String(order?.payment_method || "").trim().toLowerCase() === "myid" ||
  Number(order?.myid_result_code || 0) === 1 ||
  (order?.products || []).some((product) => Boolean(product?.credit_plan));

const getIcanCreditStatusValue = (order = {}) =>
  String(order?.ican_credit?.status || "").trim().toLowerCase();

const getIcanCreditStatusLabelValue = (order = {}) =>
  String(order?.ican_credit?.status_label || "").trim().toLowerCase();

const getProfileOrderStatusValue = (order = {}) => {
  const icanStatus = getIcanCreditStatusValue(order);
  if (orderIsInstallment(order) && icanStatus) {
    return icanStatus;
  }

  if (orderIsInstallment(order) && order?.credit_submitted) {
    return "pending";
  }

  return String(order?.status || "").trim().toLowerCase();
};

const getProfileOrderBadge = (order = {}) => {
  const status = getProfileOrderStatusValue(order);
  const statusLabel = getIcanCreditStatusLabelValue(order);
  if (!status && !statusLabel) {
    return null;
  }

  if (
    successfulOrderStatuses.has(status) ||
    statusLabel.includes("tasdiq") ||
    statusLabel.includes("одобр") ||
    statusLabel.includes("success")
  ) {
    return { label: t("profile.orderStatusApproved"), tone: "success", status };
  }

  if (
    pendingOrderStatuses.has(status) ||
    statusLabel.includes("jarayon") ||
    statusLabel.includes("process") ||
    statusLabel.includes("рассмотр")
  ) {
    return { label: t("profile.orderStatusInProgress"), tone: "warning", status };
  }

  if (cancelledOrderStatuses.has(status)) {
    return { label: t("profile.creditStatusCancelled"), tone: "error", status };
  }

  return null;
};

const getOrderSortTime = (order = {}) => {
  const date = new Date(String(order?.created_at || "").replace(" ", "T"));
  if (!Number.isNaN(date.getTime())) {
    return date.getTime();
  }

  const id = Number(order?.id || 0);
  return Number.isFinite(id) ? id : 0;
};

const getLatestProfileOrder = (orders = []) => {
  const sortedOrders = [...orders].sort((a, b) => getOrderSortTime(b) - getOrderSortTime(a));
  return (
    sortedOrders.find(
      (order) =>
        orderIsInstallment(order) &&
        (getIcanCreditStatusValue(order) || order?.credit_submitted)
    ) ||
    sortedOrders[0] ||
    null
  );
};

const loadCachedOrderBadge = () => {
  const storageKey = orderBadgeStorageKey.value;
  const rawBadge = storageKey ? getCustomerStorage()?.getItem(storageKey) : "";
  if (!rawBadge) {
    orderStatusBadge.value = null;
    return;
  }

  try {
    const badge = JSON.parse(rawBadge);
    if (badge?.label && badge?.tone) {
      orderStatusBadge.value = badge;
    }
  } catch {
    getCustomerStorage()?.removeItem(storageKey);
  }
};

const storeOrderBadge = (badge = null) => {
  const storageKey = orderBadgeStorageKey.value;
  const storage = getCustomerStorage();
  if (!storageKey || !storage) {
    return;
  }

  if (!badge) {
    storage.removeItem(storageKey);
    orderStatusBadge.value = null;
    return;
  }

  orderStatusBadge.value = badge;
  storage.setItem(storageKey, JSON.stringify(badge));
};

const loadOrderStatusBadge = async () => {
  const phone = normalizeCustomerPhone(customerSession.value?.phone || "");
  if (!phone) {
    orderStatusBadge.value = null;
    return;
  }

  loadCachedOrderBadge();

  try {
    const response = await apiClient.get("/payments/orders", {
      params: { phone },
      skipAuth: true,
      skipRetry: true,
    });
    const orders = Array.isArray(response.data?.orders) ? response.data.orders : [];
    const badge = getProfileOrderBadge(getLatestProfileOrder(orders));
    storeOrderBadge(badge);
  } catch {
    loadCachedOrderBadge();
  }
};

const changeLanguage = (lang) => {
  locale.value = lang;
  languageOpen.value = false;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("lang", lang);
  }
};

const logoutCustomer = () => {
  clearCustomerSession();
  customerSession.value = null;
  router.push("/login");
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

  loadCachedOrderBadge();
  await loadCustomerProfile();
  await loadOrderStatusBadge();

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
          <span
            v-if="item.badge"
            class="profile-menu-badge"
            :class="`is-${item.badge.tone}`"
          >
            {{ item.badge.label }}
          </span>
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
      <button
        type="button"
        class="profile-menu-row profile-logout-row"
        @click="logoutCustomer"
      >
        <span class="profile-menu-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M10 3h9v18h-9v-2h7V5h-7V3Zm1.3 5.3 1.4 1.4L10.4 12l2.3 2.3-1.4 1.4L6.6 11l4.7-4.7ZM5 11h5v2H5v-2Z" />
          </svg>
        </span>
        <span>{{ t("nav.logout") }}</span>
        <span class="profile-menu-chevron">›</span>
      </button>
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
  grid-template-columns: 32px minmax(0, 1fr) auto 18px;
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

.profile-menu-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  max-width: 132px;
  min-height: 26px;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-menu-badge.is-success {
  background: #dcfce7;
  color: #15803d;
}

.profile-menu-badge.is-warning {
  background: #fef3c7;
  color: #b45309;
}

.profile-menu-badge.is-error {
  background: #fee2e2;
  color: #b91c1c;
}

.profile-menu-row:last-child {
  border-bottom: 0;
}

.profile-menu-row:hover {
  background: #eef2f7;
}

.profile-logout-row {
  margin-top: 10px;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
}

.profile-logout-row:hover {
  background: #ffe4e6;
}

.profile-logout-row .profile-menu-icon,
.profile-logout-row .profile-menu-chevron {
  color: #ef4444;
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
  grid-column: 4;
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
    padding-top: 14px;
  }

  .profile-menu-row {
    grid-template-columns: 32px minmax(0, 1fr) auto 16px;
    gap: 8px;
  }

  .profile-menu-badge {
    max-width: 104px;
    padding-inline: 8px;
    font-size: 0.68rem;
  }
}
</style>
