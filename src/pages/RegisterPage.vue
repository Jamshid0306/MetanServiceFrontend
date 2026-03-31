<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { storeCustomerSession } from "@/lib/customerSession";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const name = ref("");
const password = ref("");
const submitting = ref(false);
const telegramEnabled = ref(false);
const telegramConfigLoading = ref(true);
const errorMessage = ref("");

const getQueryParam = (key) => {
  const value = route.query[key];
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
};

const isTelegramCallback = computed(
  () => Boolean(getQueryParam("code") && getQueryParam("state")) || Boolean(getQueryParam("error"))
);

const submitLabel = computed(() => {
  if (submitting.value && isTelegramCallback.value) {
    return t("auth.telegramCompleting");
  }

  if (submitting.value) {
    return t("auth.telegramRedirecting");
  }

  return t("auth.telegramRegisterSubmit");
});

const clearQueryParams = async () => {
  await router.replace({ path: route.path, query: {} });
};

const loadTelegramConfig = async () => {
  telegramConfigLoading.value = true;

  try {
    const response = await apiClient.get("/customers/register/telegram/config", {
      skipAuth: true,
    });
    telegramEnabled.value = Boolean(response.data?.enabled);
  } catch {
    telegramEnabled.value = false;
  } finally {
    telegramConfigLoading.value = false;
  }
};

const completeTelegramRegistration = async () => {
  const authError = getQueryParam("error").trim();
  const authErrorDescription = getQueryParam("error_description").trim();
  const code = getQueryParam("code").trim();
  const state = getQueryParam("state").trim();

  if (authError) {
    errorMessage.value = authErrorDescription || authError;
    await clearQueryParams();
    return;
  }

  if (!code || !state) {
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.post(
      "/customers/register/telegram/complete",
      {
        code,
        state,
      },
      { skipAuth: true }
    );

    storeCustomerSession(response.data?.customer || null);
    await router.replace("/");
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.telegramRegisterFailed"));
    await clearQueryParams();
  } finally {
    submitting.value = false;
  }
};

const submitRegister = async () => {
  if (!telegramEnabled.value) {
    errorMessage.value = t("auth.telegramRegisterUnavailable");
    return;
  }

  if (!name.value.trim() || !password.value.trim()) {
    errorMessage.value = t("auth.fillRequired");
    return;
  }

  if (password.value.trim().length < 8) {
    errorMessage.value = t("auth.passwordTooShort");
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    const redirectUri =
      typeof window === "undefined"
        ? ""
        : new URL(route.path, window.location.origin).toString();

    const response = await apiClient.post(
      "/customers/register/telegram/start",
      {
        name: name.value.trim(),
        password: password.value,
        redirect_uri: redirectUri,
      },
      { skipAuth: true }
    );

    const authUrl = String(response.data?.auth_url || "").trim();
    if (!authUrl || typeof window === "undefined") {
      throw new Error("Telegram auth URL is missing");
    }

    window.location.assign(authUrl);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.telegramRegisterFailed"));
    submitting.value = false;
  }
};

onMounted(async () => {
  await loadTelegramConfig();

  if (isTelegramCallback.value) {
    await completeTelegramRegistration();
  }
});
</script>

<template>
  <section class="auth-page">
    <div class="auth-shell">
      <div class="auth-card">
        <p class="auth-kicker">{{ t("auth.userAccess") }}</p>
        <h1 class="auth-title">{{ t("auth.registerTitle") }}</h1>
        <p class="auth-subtitle">{{ t("auth.registerSubtitle") }}</p>

        <form class="auth-form" @submit.prevent="submitRegister">
          <label class="auth-field">
            <span>{{ t("name") }}</span>
            <input
              v-model="name"
              type="text"
              :placeholder="t('auth.namePlaceholder')"
              class="auth-input"
            />
          </label>

          <label class="auth-field">
            <span>{{ t("auth.password") }}</span>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              :placeholder="t('auth.passwordPlaceholder')"
              class="auth-input"
            />
          </label>

          <p class="auth-note">{{ t("auth.telegramPhoneNote") }}</p>
          <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

          <button
            type="submit"
            class="auth-submit"
            :disabled="submitting || telegramConfigLoading || !telegramEnabled"
          >
            {{ submitLabel }}
          </button>
        </form>

        <p class="auth-switch">
          {{ t("auth.haveAccount") }}
          <button
            type="button"
            class="auth-switch-link"
            @click="router.push('/login')"
          >
            {{ t("auth.loginLink") }}
          </button>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 180px);
  padding: 7rem 1rem 3rem;
}

.auth-shell {
  max-width: 520px;
  margin: 0 auto;
}

.auth-card {
  border: 1px solid rgba(20, 35, 56, 0.08);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  padding: 1.25rem;
}

.auth-kicker {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.auth-title {
  margin-top: 0.35rem;
  color: #142338;
  font-size: 2rem;
  font-weight: 800;
}

.auth-subtitle {
  margin-top: 0.5rem;
  color: #607188;
  line-height: 1.6;
}

.auth-form {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.25rem;
}

.auth-field {
  display: grid;
  gap: 0.45rem;
}

.auth-field span {
  color: #304660;
  font-size: 0.88rem;
  font-weight: 700;
}

.auth-input {
  width: 100%;
  border: 1px solid rgba(20, 35, 56, 0.12);
  border-radius: 14px;
  background: #ffffff;
  color: #142338;
  padding: 0.92rem 1rem;
  outline: none;
}

.auth-input:focus {
  border-color: #18304f;
  box-shadow: 0 0 0 4px rgba(24, 48, 79, 0.08);
}

.auth-note {
  margin: 0;
  color: #607188;
  font-size: 0.92rem;
  line-height: 1.6;
}

.auth-error {
  color: #b42318;
  font-size: 0.92rem;
  font-weight: 600;
}

.auth-submit {
  border: 1px solid #18304f;
  border-radius: 16px;
  background: #18304f;
  color: #ffffff;
  padding: 0.95rem 1rem;
  font-weight: 800;
}

.auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-switch {
  margin-top: 1rem;
  color: #607188;
  text-align: center;
}

.auth-switch-link {
  border: none;
  background: transparent;
  color: #18304f;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 640px) {
  .auth-page {
    padding-top: 6.25rem;
  }

  .auth-card {
    padding: 1rem;
  }

  .auth-title {
    font-size: 1.7rem;
  }
}
</style>
