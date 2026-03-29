<script setup>
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
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

const submitRegister = async () => {
  const normalizedTelegramUsername = normalizeTelegramUsername(
    telegramUsername.value
  );

  if (
    !name.value.trim() ||
    !normalizedTelegramUsername ||
    !password.value.trim()
  ) {
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
            {{ submitting ? t("sending") : t("auth.registerSubmit") }}
          </button>
        </form>

        <p class="auth-switch">
          {{ t("auth.haveAccount") }}
          <RouterLink to="/login" class="auth-switch-link">
            {{ t("auth.loginLink") }}
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
