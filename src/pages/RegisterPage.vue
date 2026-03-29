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
  <section class="register-page">
    <div class="register-shell">
      <div class="register-card">
        <p class="register-kicker">{{ t("auth.userAccess") }}</p>
        <h1 class="register-title">{{ t("auth.registerTitle") }}</h1>
        <p class="register-subtitle">{{ t("auth.registerSubtitle") }}</p>

        <form class="register-form" @submit.prevent="submitRegister">
          <label class="register-field">
            <span>{{ t("name") }}</span>
            <input
              v-model="name"
              type="text"
              :placeholder="t('auth.namePlaceholder')"
              class="register-input"
            />
          </label>

          <label class="register-field">
            <span>{{ t("auth.telegramUsername") }}</span>
            <input
              v-model="telegramUsername"
              type="text"
              autocomplete="username"
              :placeholder="t('auth.telegramPlaceholder')"
              class="register-input"
            />
          </label>

          <label class="register-field">
            <span>{{ t("auth.password") }}</span>
            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              :placeholder="t('auth.passwordPlaceholder')"
              class="register-input"
            />
          </label>

          <p v-if="errorMessage" class="register-error">{{ errorMessage }}</p>

          <button type="submit" class="register-submit" :disabled="submitting">
            {{ submitting ? t("sending") : t("auth.registerSubmit") }}
          </button>
        </form>

        <p class="register-switch">
          {{ t("auth.haveAccount") }}
          <RouterLink to="/login" class="register-switch-link">
            {{ t("auth.loginLink") }}
          </RouterLink>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.register-page {
  min-height: calc(100vh - 180px);
  padding: 7rem 1rem 3rem;
}

.register-shell {
  max-width: 520px;
  margin: 0 auto;
}

.register-card {
  border: 1px solid rgba(20, 35, 56, 0.08);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  padding: 1.25rem;
}

.register-kicker {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.register-title {
  margin-top: 0.35rem;
  color: #142338;
  font-size: 2rem;
  font-weight: 800;
}

.register-subtitle {
  margin-top: 0.5rem;
  color: #607188;
  line-height: 1.6;
}

.register-form {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.25rem;
}

.register-field {
  display: grid;
  gap: 0.45rem;
}

.register-field span {
  color: #304660;
  font-size: 0.88rem;
  font-weight: 700;
}

.register-input {
  width: 100%;
  border: 1px solid rgba(20, 35, 56, 0.12);
  border-radius: 14px;
  background: #ffffff;
  color: #142338;
  padding: 0.92rem 1rem;
  outline: none;
}

.register-input:focus {
  border-color: #18304f;
  box-shadow: 0 0 0 4px rgba(24, 48, 79, 0.08);
}

.register-error {
  color: #b42318;
  font-size: 0.92rem;
  font-weight: 600;
}

.register-submit {
  border: 1px solid #18304f;
  border-radius: 16px;
  background: #18304f;
  color: #ffffff;
  padding: 0.95rem 1rem;
  font-weight: 800;
}

.register-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.register-switch {
  margin-top: 1rem;
  color: #607188;
  text-align: center;
}

.register-switch-link {
  color: #18304f;
  font-weight: 700;
}

@media (max-width: 640px) {
  .register-page {
    padding-top: 6.25rem;
  }

  .register-card {
    padding: 1rem;
  }

  .register-title {
    font-size: 1.7rem;
  }
}
</style>
