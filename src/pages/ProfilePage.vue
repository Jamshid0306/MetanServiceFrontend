<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import {
  CUSTOMER_SESSION_EVENT,
  formatCustomerPhone,
  getStoredCustomerSession,
} from "@/lib/customerSession";

const router = useRouter();
const { t } = useI18n();

const customerSession = ref(null);

const syncCustomerSession = () => {
  customerSession.value = getStoredCustomerSession();
};

const customerAddress = computed(() =>
  String(customerSession.value?.address || "").trim()
);

onMounted(() => {
  syncCustomerSession();
  if (!customerSession.value) {
    router.push("/login");
    return;
  }

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
    <section class="profile-card">
      <p class="profile-kicker">{{ t("profile.title") }}</p>
      <h1>{{ customerSession?.name || t("nav.login") }}</h1>

      <div class="profile-grid">
        <div class="profile-item">
          <span>{{ t("phone") }}</span>
          <strong>{{ formatCustomerPhone(customerSession?.phone || "") }}</strong>
        </div>

        <div class="profile-item">
          <span>{{ t("footer.address") }}</span>
          <strong>{{ customerAddress || "-" }}</strong>
        </div>
      </div>

      <button
        type="button"
        class="profile-orders-btn"
        @click="router.push('/profile/orders')"
      >
        {{ t("profile.orders") }}
      </button>
    </section>
  </main>
</template>

<style scoped>
.profile-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 148px 16px 28px;
}

.profile-card {
  border-radius: 18px;
  border: 1px solid #e2e8f0;
  background: #fff;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.profile-kicker {
  margin: 0;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.profile-card h1 {
  margin: 8px 0 0;
  color: #0f172a;
  font-size: clamp(1.35rem, 2.4vw, 1.7rem);
  font-weight: 800;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}

.profile-item {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-item span {
  color: #64748b;
  font-size: 0.76rem;
  font-weight: 700;
}

.profile-item strong {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 800;
  word-break: break-word;
}

.profile-orders-btn {
  margin-top: 16px;
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(20, 48, 79, 0.14);
  background: #18304f;
  color: #fff;
  font-weight: 800;
  font-size: 0.92rem;
}

@media (max-width: 720px) {
  .profile-page {
    padding-top: 136px;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }
}
</style>
