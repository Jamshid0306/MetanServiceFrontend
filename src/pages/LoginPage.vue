<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { storeCustomerSession } from "@/lib/customerSession";

const router = useRouter();
const { locale, t } = useI18n();

const identifier = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");
const telegramWidgetLoaded = ref(false);
const telegramEnabled = ref(false);
const telegramAuthenticating = ref(false);
const telegramConfigLoading = ref(true);
const telegramErrorMessage = ref("");
const telegramBotUsername = ref("");

const telegramWidgetContainerId = "telegram-login-widget";
const telegramWidgetCallbackName = "onTelegramAuth";
let telegramScriptElement = null;

const telegramWidgetLanguage = computed(() =>
  String(locale.value || "").toLowerCase().startsWith("ru") ? "ru" : "en"
);

const telegramStatusMessage = computed(() => {
  if (telegramAuthenticating.value) {
    return t("auth.telegramChecking");
  }

  if (telegramErrorMessage.value) {
    return telegramErrorMessage.value;
  }

  if (telegramConfigLoading.value) {
    return t("auth.telegramLoading");
  }

  if (!telegramEnabled.value) {
    return t("auth.telegramUnavailable");
  }

  if (!telegramWidgetLoaded.value) {
    return t("auth.telegramLoading");
  }

  return "";
});

const handleLoginSuccess = (customer) => {
  storeCustomerSession(customer);
  router.push("/");
};

const loginWithTelegram = async (user = {}) => {
  telegramAuthenticating.value = true;
  telegramErrorMessage.value = "";
  errorMessage.value = "";

  try {
    const response = await apiClient.post("/customers/telegram-login", user, {
      skipAuth: true,
    });
    handleLoginSuccess(response.data?.customer || null);
  } catch (error) {
    telegramErrorMessage.value = getApiErrorMessage(error, t("auth.telegramFailed"));
  } finally {
    telegramAuthenticating.value = false;
  }
};

const mountTelegramWidget = () => {
  if (typeof window === "undefined" || !telegramBotUsername.value) {
    return;
  }

  const container = document.getElementById(telegramWidgetContainerId);
  if (!container) {
    return;
  }

  container.innerHTML = "";
  telegramWidgetLoaded.value = false;
  telegramErrorMessage.value = "";

  window[telegramWidgetCallbackName] = async (user) => {
    await loginWithTelegram(user);
  };

  telegramScriptElement = document.createElement("script");
  telegramScriptElement.async = true;
  telegramScriptElement.src = "https://telegram.org/js/telegram-widget.js?23";
  telegramScriptElement.setAttribute("data-telegram-login", telegramBotUsername.value);
  telegramScriptElement.setAttribute("data-size", "large");
  telegramScriptElement.setAttribute("data-lang", telegramWidgetLanguage.value);
  telegramScriptElement.setAttribute("data-onauth", `${telegramWidgetCallbackName}(user)`);
  telegramScriptElement.setAttribute("data-request-access", "write");
  telegramScriptElement.onload = () => {
    telegramWidgetLoaded.value = true;
  };
  telegramScriptElement.onerror = () => {
    telegramErrorMessage.value = t("auth.telegramFailed");
  };

  container.appendChild(telegramScriptElement);
};

const loadTelegramLoginConfig = async () => {
  telegramEnabled.value = false;
  telegramConfigLoading.value = true;
  telegramBotUsername.value = "";
  telegramErrorMessage.value = "";

  try {
    const response = await apiClient.get("/customers/telegram-login/config", {
      skipAuth: true,
    });
    const botUsername = String(response.data?.bot_username || "").trim().replace(/^@+/, "");

    telegramEnabled.value = Boolean(response.data?.enabled && botUsername);
    telegramBotUsername.value = telegramEnabled.value ? botUsername : "";

    if (telegramEnabled.value) {
      mountTelegramWidget();
    }
  } catch {
    telegramErrorMessage.value = t("auth.telegramFailed");
  } finally {
    telegramConfigLoading.value = false;
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
    handleLoginSuccess(response.data?.customer || null);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.loginFailed"));
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  loadTelegramLoginConfig();
});

watch(locale, () => {
  if (telegramEnabled.value) {
    mountTelegramWidget();
  }
});

onBeforeUnmount(() => {
  if (telegramScriptElement?.remove) {
    telegramScriptElement.remove();
  }

  if (typeof window !== "undefined") {
    delete window[telegramWidgetCallbackName];
  }
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
          {{ submitting ? t("sending") : t("auth.loginSubmit") }}
        </button>
      </form>

      <div class="login-divider">
        <span>{{ t("auth.orContinueWith") }}</span>
      </div>

      <section class="telegram-box">
        <div class="telegram-copy">
          <h2 class="telegram-title">{{ t("auth.telegramTitle") }}</h2>
          <p class="telegram-subtitle">{{ t("auth.telegramSubtitle") }}</p>
        </div>

        <div v-if="telegramEnabled" :id="telegramWidgetContainerId" class="telegram-widget"></div>
        <p
          v-if="telegramStatusMessage"
          class="telegram-note"
          :class="{ 'telegram-note-error': telegramErrorMessage }"
        >
          {{ telegramStatusMessage }}
        </p>
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
  margin-bottom: 1.5rem;
}

.login-kicker {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #64748b;
}

.login-title {
  margin: 0.5rem 0 0;
  font-size: 1.65rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #142338;
  line-height: 1.2;
}

.login-lead {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: #5c6b82;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.login-label {
  font-size: 0.86rem;
  font-weight: 700;
  color: #304660;
}

.login-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(20, 35, 56, 0.14);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  font-size: 1rem;
  color: #142338;
  background: #fafbfc;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.login-input::placeholder {
  color: #94a3b8;
}

.login-input:hover {
  background: #ffffff;
}

.login-input:focus {
  background: #ffffff;
  border-color: rgba(24, 48, 79, 0.45);
  box-shadow: 0 0 0 3px rgba(24, 48, 79, 0.1);
}

.login-error {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #b42318;
  line-height: 1.45;
}

.login-submit {
  margin-top: 0.25rem;
  width: 100%;
  border: none;
  border-radius: 12px;
  padding: 0.95rem 1rem;
  font-size: 1rem;
  font-weight: 800;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(135deg, #18304f 0%, #24466f 100%);
  transition: opacity 0.15s ease, transform 0.1s ease;
}

.login-submit:hover:not(:disabled) {
  opacity: 0.95;
}

.login-submit:active:not(:disabled) {
  transform: scale(0.99);
}

.login-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.login-nav {
  margin-top: 1.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.login-divider {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-top: 1.4rem;
  color: #7a889d;
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
  background: rgba(20, 35, 56, 0.1);
}

.telegram-box {
  margin-top: 1rem;
  border-radius: 16px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #fafbfc;
  padding: 1rem;
}

.telegram-copy {
  text-align: center;
}

.telegram-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #142338;
}

.telegram-subtitle {
  margin: 0.45rem 0 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #5c6b82;
}

.telegram-widget {
  margin-top: 1rem;
  min-height: 48px;
  display: flex;
  justify-content: center;
}

.telegram-note {
  margin: 0.75rem 0 0;
  text-align: center;
  color: #5c6b82;
  font-size: 0.84rem;
  font-weight: 600;
}

.telegram-note-error {
  color: #b42318;
}

.login-switch {
  margin: 0;
  font-size: 0.92rem;
  color: #607188;
}

.login-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 0.92rem;
  font-weight: 600;
  color: #18304f;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.login-link:hover {
  color: #142338;
}

.login-link-strong {
  font-weight: 800;
  text-decoration: none;
}

.login-link-strong:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-inner {
    padding: 1.5rem 1.15rem;
  }

  .login-title {
    font-size: 1.45rem;
  }
}
</style>
