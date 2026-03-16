<script setup>
import { computed, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import TelegramLoginButton from "@/components/TelegramLoginButton.vue";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import {
  normalizeCustomerPhone,
  storeCustomerSession,
} from "@/lib/customerSession";

const router = useRouter();
const { t } = useI18n();

const phone = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");

const canSubmit = computed(
  () => phone.value.trim().length > 0 && password.value.trim().length > 0
);

const submitTelegramLogin = async (telegramUser) => {
  submitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.post("/customers/telegram", telegramUser);
    storeCustomerSession(response.data?.customer || null);
    router.push("/");
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.telegramFailed"));
  } finally {
    submitting.value = false;
  }
};

const submitLogin = async () => {
  if (!canSubmit.value) {
    errorMessage.value = t("auth.fillRequired");
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.post("/customers/login", {
      phone: normalizeCustomerPhone(phone.value),
      password: password.value,
    });

    storeCustomerSession(response.data?.customer || null);
    router.push("/");
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
          <TelegramLoginButton
            @auth="submitTelegramLogin"
            @error="errorMessage = $event"
          />
          <p class="auth-telegram-hint">{{ t("auth.telegramHint") }}</p>
        </div>

        <div class="auth-divider">
          <span>{{ t("auth.orContinue") }}</span>
        </div>

        <form class="auth-form" @submit.prevent="submitLogin">
          <label class="auth-field">
            <span>{{ t("phone") }}</span>
            <input
              v-model="phone"
              type="tel"
              :placeholder="t('auth.phonePlaceholder')"
              class="auth-input"
            />
          </label>

          <label class="auth-field">
            <span>{{ t("auth.password") }}</span>
            <input
              v-model="password"
              type="password"
              :placeholder="t('auth.passwordPlaceholder')"
              class="auth-input"
            />
          </label>

          <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

          <button
            type="submit"
            class="auth-submit"
            :disabled="submitting"
          >
            {{ submitting ? t("sending") : t("auth.loginSubmit") }}
          </button>
        </form>

        <p class="auth-switch">
          {{ t("auth.noAccount") }}
          <RouterLink to="/register" class="auth-switch-link">
            {{ t("auth.registerLink") }}
          </RouterLink>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 180px);
  padding: 7.5rem 1rem 3rem;
}

.auth-shell {
  max-width: 1120px;
  margin: 0 auto;
}

.auth-card {
  width: min(460px, 100%);
  margin: 0 auto;
  border-radius: 28px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: linear-gradient(180deg, #fcfcfb 0%, #f4f6f8 100%);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  padding: 1.4rem;
}

.auth-kicker {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6a7d71;
}

.auth-title {
  margin-top: 0.45rem;
  color: #142338;
  font-size: clamp(1.7rem, 3vw, 2.3rem);
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
  margin-top: 1.2rem;
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
  background: #f7f8f9;
  color: #6b7b91;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0 0.75rem;
}

.auth-field {
  display: grid;
  gap: 0.45rem;
}

.auth-field span {
  color: #304660;
  font-size: 0.86rem;
  font-weight: 700;
}

.auth-input {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: #ffffff;
  color: #142338;
  padding: 0.9rem 1rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
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
  width: 100%;
  border-radius: 18px;
  border: 1px solid #18304f;
  background: #18304f;
  color: #ffffff;
  padding: 1rem 1.2rem;
  font-weight: 800;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.auth-submit:hover:not(:disabled) {
  background: #12263d;
  border-color: #12263d;
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
  color: #18304f;
  font-weight: 700;
}

@media (max-width: 640px) {
  .auth-page {
    padding-top: 6.6rem;
  }

  .auth-card {
    border-radius: 22px;
    padding: 1rem;
  }
}
</style>
