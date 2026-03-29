<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import TelegramLoginButton from "@/components/TelegramLoginButton.vue";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { storeCustomerSession } from "@/lib/customerSession";

const router = useRouter();
const { t } = useI18n();

const name = ref("");
const telegramUsername = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");

const normalizeTelegramUsername = (value = "") =>
  String(value || "").trim().replace(/^@+/, "").toLowerCase();

const submitTelegramLogin = async (telegramUser) => {
  submitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.post("/customers/telegram", telegramUser, {
      skipAuth: true,
    });

    const customer = response.data?.customer || null;

    storeCustomerSession(customer);

    if (customer?.has_password === false) {
      router.push({ path: "/forgot-password", query: { mode: "set-password" } });
    } else {
      router.push("/");
    }
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.telegramFailed"));
  } finally {
    submitting.value = false;
  }
};

const submitRegister = async () => {
  const normalizedTelegramUsername = normalizeTelegramUsername(telegramUsername.value);

  if (!name.value.trim() || !normalizedTelegramUsername || !password.value.trim()) {
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
    const response = await apiClient.post("/customers/register", {
      name: name.value.trim(),
      telegram_username: normalizedTelegramUsername,
      password: password.value,
    });

    storeCustomerSession(response.data?.customer || null);
    router.push("/");
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.registerFailed"));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="auth-page">
    <div class="auth-shell">
      <div class="auth-card">
        <p class="auth-kicker">{{ t("auth.userAccess") }}</p>
        <h1 class="auth-title">{{ t("auth.registerTitle") }}</h1>
        <p class="auth-subtitle">{{ t("auth.registerSubtitle") }}</p>

        <div class="auth-telegram-block">
          <TelegramLoginButton
            @auth="submitTelegramLogin"
            @error="errorMessage = $event"
          />
          <p class="auth-telegram-hint">{{ t("auth.telegramHint") }}</p>
        </div>

        <div class="auth-divider">
          <span>{{ t("auth.orContinue") }}</span>
        </div>

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
            <span>{{ t("auth.telegramUsername") }}</span>
            <input
              v-model="telegramUsername"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.telegramPlaceholder')"
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

          <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

          <button type="submit" class="auth-submit" :disabled="submitting">
            {{ submitting ? t("sending") : t("auth.registerSubmit") }}
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

.auth-telegram-block {
  display: grid;
  gap: 0.7rem;
  margin-top: 1.2rem;
}

.auth-telegram-hint {
  color: #607188;
  font-size: 0.92rem;
  line-height: 1.5;
  text-align: center;
}

.auth-divider {
  position: relative;
  margin-top: 1.1rem;
  text-align: center;
}

.auth-divider::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(20, 35, 56, 0.1);
}

.auth-divider span {
  position: relative;
  z-index: 1;
  display: inline-block;
  background: #ffffff;
  color: #6b7b91;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0 0.75rem;
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
