<script setup>
import { ref } from "vue";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { storeCustomerSession } from "@/lib/customerSession";

const identifier = ref("");
const password = ref("");
const submitting = ref(false);
const errorMessage = ref("");

const goTo = (path) => {
  if (typeof window !== "undefined") {
    window.location.href = path;
  }
};

const submitLogin = async () => {
  if (!identifier.value.trim() || !password.value.trim()) {
    errorMessage.value = "Iltimos, barcha maydonlarni to'ldiring.";
    return;
  }

  if (password.value.trim().length < 8) {
    errorMessage.value = "Parol kamida 8 ta belgidan iborat bo'lishi kerak.";
    return;
  }

  submitting.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.post("/customers/login", {
      identifier: identifier.value.trim(),
      password: password.value,
    });

    storeCustomerSession(response.data?.customer || null);
    goTo("/");
  } catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      "Login bajarilmadi. Qaytadan urinib ko'ring."
    );
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="login-page">
    <div class="login-shell">
      <div class="login-card">
        <p class="login-kicker">USER ACCESS</p>
        <h1 class="login-title">Login</h1>
        <p class="login-subtitle">
          Telegram username yoki telefon raqam va parol bilan tizimga kiring.
        </p>

        <form class="login-form" @submit.prevent="submitLogin">
          <label class="login-field">
            <span>Telegram username yoki telefon</span>
            <input
              v-model="identifier"
              type="text"
              autocomplete="username"
              placeholder="@username yoki 998901234567"
              class="login-input"
            />
          </label>

          <label class="login-field">
            <span>Parol</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="Parolni kiriting"
              class="login-input"
            />
          </label>

          <button
            type="button"
            class="login-link-button"
            @click="goTo('/forgot-password')"
          >
            Parolni unutdingizmi?
          </button>

          <p v-if="errorMessage" class="login-error">{{ errorMessage }}</p>

          <button type="submit" class="login-submit" :disabled="submitting">
            {{ submitting ? "Yuborilmoqda..." : "Kirish" }}
          </button>
        </form>

        <p class="login-switch">
          Akkountingiz yo'qmi?
          <button
            type="button"
            class="login-switch-link"
            @click="goTo('/register')"
          >
            Ro'yxatdan o'tish
          </button>
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: calc(100vh - 180px);
  padding: 7rem 1rem 3rem;
}

.login-shell {
  max-width: 520px;
  margin: 0 auto;
}

.login-card {
  border: 1px solid rgba(20, 35, 56, 0.08);
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  padding: 1.25rem;
}

.login-kicker {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-title {
  margin-top: 0.35rem;
  color: #142338;
  font-size: 2rem;
  font-weight: 800;
}

.login-subtitle {
  margin-top: 0.5rem;
  color: #607188;
  line-height: 1.6;
}

.login-form {
  display: grid;
  gap: 0.9rem;
  margin-top: 1.25rem;
}

.login-field {
  display: grid;
  gap: 0.45rem;
}

.login-field span {
  color: #304660;
  font-size: 0.88rem;
  font-weight: 700;
}

.login-input {
  width: 100%;
  border: 1px solid rgba(20, 35, 56, 0.12);
  border-radius: 14px;
  background: #ffffff;
  color: #142338;
  padding: 0.92rem 1rem;
  outline: none;
}

.login-input:focus {
  border-color: #18304f;
  box-shadow: 0 0 0 4px rgba(24, 48, 79, 0.08);
}

.login-link-button {
  justify-self: end;
  border: none;
  background: transparent;
  color: #18304f;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0;
  cursor: pointer;
}

.login-error {
  color: #b42318;
  font-size: 0.92rem;
  font-weight: 600;
}

.login-submit {
  border: 1px solid #18304f;
  border-radius: 16px;
  background: #18304f;
  color: #ffffff;
  padding: 0.95rem 1rem;
  font-weight: 800;
}

.login-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-switch {
  margin-top: 1rem;
  color: #607188;
  text-align: center;
}

.login-switch-link {
  border: none;
  background: transparent;
  color: #18304f;
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 640px) {
  .login-page {
    padding-top: 6.25rem;
  }

  .login-card {
    padding: 1rem;
  }

  .login-title {
    font-size: 1.7rem;
  }
}
</style>
