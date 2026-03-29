<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { apiClient } from "@/lib/api";

const emit = defineEmits(["auth", "error"]);

const hostRef = ref(null);
const botUsername = ref(String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim());
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
  const mountWidget = async () => {
    if (!hostRef.value) {
      return;
    }

    if (!botUsername.value) {
      try {
        const response = await apiClient.get("/customers/telegram/config");
        botUsername.value = String(response.data?.bot_username || "").trim();
      } catch {
        botUsername.value = "";
      }
    }

    if (!botUsername.value) {
      emit("error", "Telegram login hozircha sozlanmagan.");
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
      scriptEl.setAttribute(
        "data-telegram-login",
        botUsername.value.replace(/^@+/, "")
      );
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
  };

  void mountWidget();
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
