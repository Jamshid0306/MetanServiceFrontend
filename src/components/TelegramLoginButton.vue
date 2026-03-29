<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["auth", "error"]);

const hostRef = ref(null);
const botUsername = "urganch_metan_servis_bot";
const TELEGRAM_SCRIPT_SRC = "https://telegram.org/js/telegram-widget.js?23";

let scriptEl = null;
let widgetCallbackName = "";

const cleanupWidget = () => {
  if (hostRef.value) {
    hostRef.value.innerHTML = "";
  }

  if (widgetCallbackName && typeof window !== "undefined") {
    delete window[widgetCallbackName];
  }

  scriptEl = null;
  widgetCallbackName = "";
};

onMounted(() => {
  if (!hostRef.value) {
    return;
  }

  try {
    cleanupWidget();

    widgetCallbackName = `onTelegramAuth_${Math.random().toString(36).slice(2)}`;
    window[widgetCallbackName] = (user) => {
      emit("auth", user);
    };

    scriptEl = document.createElement("script");
    scriptEl.async = true;
    scriptEl.src = TELEGRAM_SCRIPT_SRC;
    scriptEl.setAttribute("data-telegram-login", botUsername);
    scriptEl.setAttribute("data-size", "large");
    scriptEl.setAttribute("data-onauth", `${widgetCallbackName}(user)`);
    scriptEl.setAttribute("data-request-access", "write");
    scriptEl.onerror = () => {
      emit("error", "Telegram tugmasini yuklab bo'lmadi.");
      cleanupWidget();
    };

    hostRef.value.appendChild(scriptEl);
  } catch {
    emit("error", "Telegram tugmasini yuklab bo'lmadi.");
    cleanupWidget();
  }
});

onBeforeUnmount(() => {
  cleanupWidget();
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
