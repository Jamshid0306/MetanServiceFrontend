<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["auth", "error"]);

const widgetRef = ref(null);
const botUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim();
const widgetScriptUrl = "https://telegram.org/js/telegram-widget.js?23";
const callbackName = "onTelegramAuth";

const renderWidget = () => {
  if (typeof window === "undefined" || !widgetRef.value) {
    return;
  }

  if (!botUsername) {
    emit("error", "Telegram login hozircha sozlanmagan.");
    return;
  }

  try {
    widgetRef.value.innerHTML = "";

    window[callbackName] = (user) => {
      emit("auth", user);
    };

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    script.setAttribute("data-request-access", "write");
    script.onerror = () => {
      emit("error", "Telegram tugmasini yuklab bo'lmadi.");
    };
    script.src = widgetScriptUrl;

    widgetRef.value.appendChild(script);
  } catch {
    emit("error", "Telegram tugmasini yuklab bo'lmadi.");
  }
};

onMounted(() => {
  renderWidget();
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    delete window[callbackName];
  }
});
</script>

<template>
  <div ref="widgetRef" class="telegram-widget-host" />
</template>

<style scoped>
.telegram-widget-host {
  min-height: 42px;
  display: grid;
  justify-items: center;
}
</style>
