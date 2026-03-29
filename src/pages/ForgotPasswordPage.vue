<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import TelegramLoginButton from "@/components/TelegramLoginButton.vue";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { normalizeCustomerPhone } from "@/lib/customerSession";

const router = useRouter();
const { t } = useI18n();

const verifiedPhone = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const submitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const isReadyForPassword = computed(() => Boolean(verifiedPhone.value));
const canSubmit = computed(
  () =>
    isReadyForPassword.value &&
    newPassword.value.trim().length >= 8 &&
    newPassword.value === confirmPassword.value
);

const handleTelegramAuth = async (telegramUser) => {
  submitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const response = await apiClient.post("/customers/telegram", telegramUser, {
      skipAuth: true,
    });

    const rawPhone =
      response.data?.customer?.phone ||
      response.data?.customer?.phone_number ||
      "";

    const normalized = normalizeCustomerPhone(rawPhone);

    if (!normalized) {
      errorMessage.value = t("auth.resetNoPhone");
      return;
    }

    verifiedPhone.value = normalized;
    successMessage.value = t("auth.resetVerified");
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.telegramFailed"));
  } finally {
    submitting.value = false;
  }
};

const submitNewPassword = async () => {
  if (!canSubmit.value) {
    if (!newPassword.value.trim() || !confirmPassword.value.trim()) {
      errorMessage.value = t("auth.fillRequired");
    } else if (!verifiedPhone.value.trim()) {
      errorMessage.value = t("auth.resetNoPhone");
    } else if (newPassword.value.trim().length < 8) {
      errorMessage.value = t("auth.passwordTooShort");
    } else if (newPassword.value !== confirmPassword.value) {
      errorMessage.value = t("auth.passwordsDontMatch");
    }
    return;
  }

  submitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await apiClient.post("/customers/reset-password", {
      phone: verifiedPhone.value,
      password: newPassword.value.trim(),
    });

    successMessage.value = t("auth.resetSuccess");

    setTimeout(() => {
      router.push("/login");
    }, 1200);
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
        <h1 class="auth-title">{{ t("auth.resetTitle") }}</h1>
        <p class="auth-subtitle">{{ t("auth.resetSubtitle") }}</p>

        <div class="auth-telegram-block">
          <TelegramLoginButton
            @auth="handleTelegramAuth"
            @error="errorMessage = $event"
          />
          <p class="auth-telegram-hint">{{ t("auth.resetTelegramHint") }}</p>
        </div>

        <div v-if="isReadyForPassword" class="auth-divider">
          <span>{{ t("auth.orContinue") }}</span>
        </div>

        <form
          v-if="isReadyForPassword"
          class="auth-form"
          @submit.prevent="submitNewPassword"
        >
          <div class="auth-meta">
            <span>{{ t("phone") }}</span>
            <strong>+{{ verifiedPhone }}</strong>
          </div>

          <label class="auth-field">
            <span>{{ t("auth.newPassword") }}</span>
            <input
              v-model="newPassword"
              type="password"
              :placeholder="t('auth.newPasswordPlaceholder')"
              class="auth-input"
            />
          </label>

          <label class="auth-field">
            <span>{{ t("auth.confirmPassword") }}</span>
            <input
              v-model="confirmPassword"
              type="password"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
              class="auth-input"
            />
          </label>

          <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>
          <p v-if="successMessage" class="auth-success">{{ successMessage }}</p>

          <button type="submit" class="auth-submit" :disabled="submitting">
            {{ submitting ? t("sending") : t("auth.resetSubmit") }}
          </button>
        </form>
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

.auth-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #304660;
  font-size: 0.9rem;
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

.auth-success {
  color: #15803d;
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
