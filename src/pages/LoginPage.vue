<script setup>
import { defineAsyncComponent, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { storeCustomerSession } from "@/lib/customerSession";

const TelegramLoginButton = defineAsyncComponent({
  loader: () => import("@/components/TelegramLoginButton.vue"),
  delay: 0,
  timeout: 120000,
});

const router = useRouter();
const { t } = useI18n();

const identifier = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");

const handleLoginSuccess = (customer) => {
  storeCustomerSession(customer);
  router.push("/");
};

const submitTelegramLogin = async (telegramUser) => {
  submitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.post("/customers/telegram", telegramUser, {
      skipAuth: true,
    });
    handleLoginSuccess(response.data?.customer || null);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.telegramFailed"));
  } finally {
    submitting.value = false;
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
    const response = await apiClient.post("/customers/login", {
      identifier: identifier.value.trim(),
      password: password.value,
    });
    handleLoginSuccess(response.data?.customer || null);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.loginFailed"));
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
        <h1 class="auth-title">{{ t("auth.loginTitle") }}</h1>
        <p class="auth-subtitle">{{ t("auth.loginSubtitle") }}</p>

        <div class="auth-telegram-block">
          <Suspense>
            <TelegramLoginButton
              @auth="submitTelegramLogin"
              @error="errorMessage = $event"
            />
            <template #fallback>
              <div class="telegram-login-fallback" aria-hidden="true" />
            </template>
          </Suspense>
          <p class="auth-telegram-hint">{{ t("auth.telegramHint") }}</p>
        </div>

        <div class="auth-divider">
          <span>{{ t("auth.orContinue") }}</span>
        </div>

        <form class="auth-form" @submit.prevent="submitLogin">
          <label class="auth-field">
            <span>{{ t("auth.loginIdentifier") }}</span>
            <input
              v-model="identifier"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.loginIdentifierPlaceholder')"
              class="auth-input"
            />
          </label>

          <label class="auth-field">
            <span>{{ t("auth.password") }}</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              :placeholder="t('auth.passwordPlaceholder')"
              class="auth-input"
            />
          </label>

          <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

          <button type="submit" class="auth-submit" :disabled="submitting">
            {{ submitting ? t("sending") : t("auth.loginSubmit") }}
          </button>
        </form>

        <button
          type="button"
          class="auth-inline-link"
          @click="router.push('/forgot-password')"
        >
          {{ t("auth.forgotPassword") }}
        </button>

        <p class="auth-switch">
          {{ t("auth.noAccount") }}
          <button
            type="button"
            class="auth-switch-link"
            @click="router.push('/register')"
          >
            {{ t("auth.registerLink") }}
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

.telegram-login-fallback {
  min-height: 48px;
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
  border-color: rgba(22, 163, 74, 0.45);
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
}

.auth-error {
  color: #dc2626;
  font-size: 0.9rem;
  line-height: 1.5;
}

.auth-submit {
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #ffffff;
  cursor: pointer;
  font-weight: 800;
  padding: 0.95rem 1rem;
}

.auth-submit:disabled {
  cursor: wait;
  opacity: 0.7;
}

.auth-inline-link,
.auth-switch-link {
  border: none;
  background: transparent;
  color: #15803d;
  cursor: pointer;
  font-weight: 700;
  padding: 0;
}

.auth-inline-link {
  display: block;
  margin-top: 0.9rem;
  margin-left: auto;
}

.auth-switch {
  color: #607188;
  margin-top: 1.1rem;
  text-align: center;
}

@media (max-width: 640px) {
  .auth-page {
    padding-top: 6rem;
  }

  .auth-card {
    border-radius: 20px;
    padding: 1.1rem;
  }

  .auth-title {
    font-size: 1.7rem;
  }
}
</style>
