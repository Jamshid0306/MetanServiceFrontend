<script setup>
import { onMounted, ref } from "vue";

const emit = defineEmits(["auth", "error"]);

const hostRef = ref(null);
const botUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim();

onMounted(() => {
  if (!hostRef.value) {
    return;
  }

  if (!botUsername) {
    emit("error", "Telegram login hozircha sozlanmagan.");
    return;
  }

  try {
    const wrapper = document.createElement("div");
    wrapper.innerHTML =
      `<script async src="https://telegram.org/js/telegram-widget.js?23" ` +
      `data-telegram-login="${botUsername}" ` +
      `data-size="large" ` +
      `data-onauth="onTelegramAuth(user)" ` +
      `data-request-access="write"></` +
      `script>`;

    window.onTelegramAuth = (user) => {
      emit("auth", user);
    };

    hostRef.value.innerHTML = "";
    hostRef.value.appendChild(wrapper);
  } catch {
    emit("error", "Telegram tugmasini yuklab bo'lmadi.");
  }
});
</script>

<template>
  <div ref="hostRef" class="telegram-login-host" />
</template>

<style scoped>
.telegram-login-host {
  min-height: 48px;
  display: grid;
  justify-items: center;
}
</style>
