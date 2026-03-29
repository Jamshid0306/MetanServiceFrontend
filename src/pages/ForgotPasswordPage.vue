<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { normalizeCustomerPhone } from "@/lib/customerSession";

const router = useRouter();
const { t } = useI18n();

const phone = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const submitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");

const submitReset = async () => {
  const normalizedPhone = normalizeCustomerPhone(phone.value);

  if (!normalizedPhone || !newPassword.value.trim() || !confirmPassword.value.trim()) {
    errorMessage.value = t("auth.fillRequired");
    return;
  }

  if (newPassword.value.trim().length < 8) {
    errorMessage.value = t("auth.passwordTooShort");
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = t("auth.passwordsDontMatch");
    return;
  }

  submitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await apiClient.post(
      "/customers/reset-password",
      {
        phone: normalizedPhone,
        password: newPassword.value.trim(),
      },
      { skipAuth: true }
    );

    successMessage.value = t("auth.resetSuccess");

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.resetFailed"));
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

        <form class="auth-form" @submit.prevent="submitReset">
          <label class="auth-field">
            <span>{{ t("phone") }}</span>
            <input
              v-model="phone"
              type="tel"
              autocomplete="tel"
              :placeholder="t('auth.phonePlaceholder')"
              class="auth-input"
            />
          </label>

          <label class="auth-field">
            <span>{{ t("auth.newPassword") }}</span>
            <input
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              :placeholder="t('auth.newPasswordPlaceholder')"
              class="auth-input"
            />
          </label>

          <label class="auth-field">
            <span>{{ t("auth.confirmPassword") }}</span>
            <input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
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

        <p class="auth-switch">
          <button type="button" class="auth-switch-link" @click="router.push('/login')">
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

.auth-switch {
  margin-top: 1rem;
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
