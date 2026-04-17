<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import {
  ensureUzbekistanPhoneInput,
  formatUzbekistanPhoneInput,
  storeCustomerAccessToken,
  storeCustomerSession,
} from "@/lib/customerSession";

const router = useRouter();
const { t } = useI18n();

const identifier = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");

const telegramEnabled = ref(false);
const telegramConfigLoading = ref(true);
const telegramErrorMessage = ref("");
const telegramStatusMessage = ref("");
const telegramLoginState = ref("");
const telegramBotUrl = ref("");
const telegramSubmitting = ref(false);
let pollingTimer = null;

const submitLabel = computed(() =>
  submitting.value ? t("sending") : t("auth.loginSubmit")
);
const telegramSubmitLabel = computed(() =>
  telegramSubmitting.value ? t("auth.telegramLoading") : t("auth.telegramLoginBotSubmit")
);

const stopPolling = () => {
  if (pollingTimer) {
    window.clearInterval(pollingTimer);
    pollingTimer = null;
  }
};

const resetTelegramState = () => {
  telegramErrorMessage.value = "";
  telegramStatusMessage.value = "";
  telegramLoginState.value = "";
  telegramBotUrl.value = "";
  telegramSubmitting.value = false;
  stopPolling();
};

const handleIdentifierFocus = () => {
  if (!String(identifier.value || "").trim()) {
    identifier.value = ensureUzbekistanPhoneInput(identifier.value);
  }
};

const handleIdentifierInput = (event) => {
  const rawValue = String(event.target.value || "");
  const normalizedRawValue = rawValue.trim();

  if (!normalizedRawValue) {
    identifier.value = "";
    return;
  }

  const isPhoneLike =
    normalizedRawValue.startsWith("+") ||
    /^\d/.test(normalizedRawValue) ||
    String(identifier.value || "").startsWith("+998");

  identifier.value = isPhoneLike
    ? formatUzbekistanPhoneInput(rawValue)
    : rawValue;
};

const handleIdentifierBlur = () => {
  if (String(identifier.value || "").trim() === "+998") {
    identifier.value = "";
  }
};

const handleLoginSuccess = (customer, accessToken = "") => {
  storeCustomerSession(customer);
  storeCustomerAccessToken(accessToken);
  router.push("/");
};

const loadTelegramLoginConfig = async () => {
  telegramConfigLoading.value = true;

  try {
    const response = await apiClient.get("/customers/login/telegram/config", {
      skipAuth: true,
    });
    telegramEnabled.value = Boolean(response.data?.enabled);
  } catch {
    telegramEnabled.value = false;
  } finally {
    telegramConfigLoading.value = false;
  }
};

const pollTelegramLoginStatus = async () => {
  if (!telegramLoginState.value) {
    return;
  }

  try {
    const response = await apiClient.get(
      `/customers/login/telegram/status/${telegramLoginState.value}`,
      { skipAuth: true }
    );
    const payload = response.data || {};
    const status = String(payload.status || "").trim();

    if (status === "pending") {
      telegramStatusMessage.value = t("auth.telegramAwaitingBotStart");
      return;
    }

    if (status === "awaiting_contact") {
      telegramStatusMessage.value = t("auth.telegramAwaitingContact");
      return;
    }

    if (status === "completed") {
      stopPolling();
      telegramSubmitting.value = false;
      telegramStatusMessage.value = t("auth.telegramLoginComplete");
      handleLoginSuccess(payload.customer || null, payload.access_token || "");
      return;
    }

    if (status === "failed") {
      stopPolling();
      telegramSubmitting.value = false;
      telegramErrorMessage.value = payload.error || t("auth.telegramFailed");
      telegramStatusMessage.value = "";
    }
  } catch (error) {
    const detail = getApiErrorMessage(error, t("auth.telegramFailed"));
    if (detail === "Telegram login session expired") {
      stopPolling();
      telegramSubmitting.value = false;
      telegramErrorMessage.value = t("auth.telegramSessionExpired");
      telegramStatusMessage.value = "";
    }
  }
};

const startPolling = () => {
  stopPolling();
  pollingTimer = window.setInterval(() => {
    pollTelegramLoginStatus();
  }, 3000);
};

const startTelegramLogin = async () => {
  if (!telegramEnabled.value) {
    telegramErrorMessage.value = t("auth.telegramUnavailable");
    return;
  }

  telegramSubmitting.value = true;
  telegramErrorMessage.value = "";
  telegramStatusMessage.value = "";

  try {
    const response = await apiClient.post(
      "/customers/login/telegram/start",
      {},
      { skipAuth: true }
    );

    telegramLoginState.value = String(response.data?.state || "").trim();
    telegramBotUrl.value = String(response.data?.bot_url || "").trim();

    if (!telegramLoginState.value || !telegramBotUrl.value) {
      throw new Error("Telegram bot URL is missing");
    }

    telegramStatusMessage.value = t("auth.telegramAwaitingBotStart");
    pollTelegramLoginStatus();
    startPolling();

    const popup = window.open(telegramBotUrl.value, "_blank", "noopener,noreferrer");
    if (!popup) {
      telegramStatusMessage.value = t("auth.telegramPopupBlocked");
    }
  } catch (error) {
    telegramSubmitting.value = false;
    telegramErrorMessage.value = getApiErrorMessage(error, t("auth.telegramFailed"));
  }
};

const submitLogin = async () => {
  if (!identifier.value.trim() || !password.value.trim()) {
    errorMessage.value = t("auth.fillRequired");
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.post(
      "/customers/login",
      {
        identifier: identifier.value.trim(),
        password: password.value,
      },
      { skipAuth: true }
    );
    handleLoginSuccess(response.data?.customer || null, response.data?.access_token || "");
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.loginFailed"));
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadTelegramLoginConfig();
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>

<template>
  <main class="login-page">
    <div class="login-inner">
      <header class="login-head">
        <p class="login-kicker">{{ t("auth.userAccess") }}</p>
        <h1 class="login-title">{{ t("auth.loginTitle") }}</h1>
        <p class="login-lead">{{ t("auth.loginSubtitle") }}</p>
      </header>

      <form class="login-form" @submit.prevent="submitLogin">
        <label class="login-field">
          <span class="login-label">{{ t("auth.loginIdentifier") }}</span>
          <input
            v-model="identifier"
            type="text"
            name="identifier"
            autocomplete="username"
            :placeholder="t('auth.loginIdentifierPlaceholder')"
            class="login-input"
            @focus="handleIdentifierFocus"
            @input="handleIdentifierInput"
            @blur="handleIdentifierBlur"
          />
        </label>

        <label class="login-field">
          <span class="login-label">{{ t("auth.password") }}</span>
          <input
            v-model="password"
            type="password"
            name="password"
            autocomplete="current-password"
            :placeholder="t('auth.passwordPlaceholder')"
            class="login-input"
          />
        </label>

        <p v-if="errorMessage" class="login-error" role="alert">{{ errorMessage }}</p>

        <button type="submit" class="login-submit" :disabled="submitting">
          {{ submitLabel }}
        </button>
      </form>

      <div class="login-divider">
        <span>{{ t("auth.orContinueWith") }}</span>
      </div>

      <section class="telegram-box">
        <div class="telegram-copy">
          <h2 class="telegram-title">{{ t("auth.telegramTitle") }}</h2>
          <p class="telegram-subtitle">{{ t("auth.telegramLoginBotSubtitle") }}</p>
        </div>

        <a
          v-if="telegramBotUrl"
          :href="telegramBotUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="telegram-open-link"
        >
          {{ t("auth.telegramOpenBot") }}
        </a>

        <p
          v-if="telegramStatusMessage"
          class="telegram-note"
          :class="{ 'telegram-note-error': telegramErrorMessage }"
        >
          {{ telegramStatusMessage }}
        </p>
        <p v-if="telegramErrorMessage" class="telegram-note telegram-note-error">
          {{ telegramErrorMessage }}
        </p>

        <button
          type="button"
          class="telegram-login-btn"
          :disabled="telegramSubmitting || telegramConfigLoading || !telegramEnabled"
          @click="startTelegramLogin"
        >
          {{ telegramSubmitLabel }}
        </button>
      </section>

      <nav class="login-nav">
        <button type="button" class="login-link" @click="router.push('/forgot-password')">
          {{ t("auth.forgotPassword") }}
        </button>
        <p class="login-switch">
          {{ t("auth.noAccount") }}
          <button type="button" class="login-link login-link-strong" @click="router.push('/register')">
            {{ t("auth.registerLink") }}
          </button>
        </p>
      </nav>
    </div>
  </main>
</template>

<style scoped>
.login-page {
  min-height: min(100vh, 100dvh);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5.5rem 1rem 2rem;
  box-sizing: border-box;
}

.login-inner {
  width: 100%;
  max-width: 420px;
  padding: 1.75rem 1.5rem;
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #ffffff;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.login-head {
  text-align: center;
}

.login-kicker {
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #607188;
}

.login-title {
  margin-top: 0.35rem;
  font-size: 2rem;
  line-height: 1.1;
  font-weight: 800;
  color: #142338;
}

.login-lead {
  margin-top: 0.7rem;
  color: #607188;
  font-size: 0.98rem;
  line-height: 1.6;
}

.login-form {
  margin-top: 1.6rem;
  display: grid;
  gap: 0.95rem;
}

.login-field {
  display: grid;
  gap: 0.45rem;
}

.login-label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #304660;
}

.login-input {
  width: 100%;
  border: 1px solid rgba(20, 35, 56, 0.12);
  border-radius: 14px;
  padding: 0.92rem 1rem;
  font-size: 0.98rem;
  color: #142338;
  background: #ffffff;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.login-input:focus {
  border-color: #18304f;
  box-shadow: 0 0 0 4px rgba(24, 48, 79, 0.08);
}

.login-error {
  margin: 0;
  color: #b42318;
  font-size: 0.92rem;
  font-weight: 600;
}

.login-submit,
.telegram-login-btn {
  border: 1px solid #18304f;
  border-radius: 16px;
  background: #18304f;
  color: #ffffff;
  padding: 0.98rem 1rem;
  font-size: 0.98rem;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.login-submit:hover,
.telegram-login-btn:hover {
  background: #142338;
  transform: translateY(-1px);
}

.login-submit:disabled,
.telegram-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.login-divider {
  margin: 1.35rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #8a9aae;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.login-divider::before,
.login-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(20, 35, 56, 0.12);
}

.telegram-box {
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #f8fafc;
}

.telegram-title {
  font-size: 1rem;
  font-weight: 800;
  color: #142338;
}

.telegram-subtitle {
  margin-top: 0.35rem;
  color: #607188;
  line-height: 1.55;
}

.telegram-open-link {
  color: #18304f;
  font-weight: 700;
}

.telegram-note {
  color: #607188;
  font-size: 0.92rem;
  font-weight: 600;
}

.telegram-note-error {
  color: #b42318;
}

.login-nav {
  margin-top: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  align-items: center;
}

.login-link {
  border: none;
  background: transparent;
  color: #18304f;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
}

.login-link-strong {
  padding-left: 0.15rem;
}

.login-switch {
  color: #607188;
  font-size: 0.94rem;
}

@media (max-width: 640px) {
  .login-page {
    align-items: flex-start;
    padding-top: 6.25rem;
  }

  .login-inner {
    padding: 1.2rem 1rem;
    border-radius: 18px;
  }

  .login-title {
    font-size: 1.7rem;
  }
}
</style>
