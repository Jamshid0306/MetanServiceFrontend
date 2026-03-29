<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["auth", "error"]);

const widgetRef = ref(null);
const botUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim();
const widgetScriptUrl = "https://telegram.org/js/telegram-widget.js?22";
const callbackName = `telegramLoginCallback_${Math.random().toString(36).slice(2)}`;

const getWidgetLanguage = () => {
  if (typeof window === "undefined") {
    return "en";
  }

  const lang = String(window.localStorage?.getItem("lang") || "en").toLowerCase();
  if (lang === "ru") {
    return "ru";
  }

  if (lang === "en") {
    return "en";
  }

  return "en";
};

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
    script.setAttribute("data-radius", "16");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-lang", getWidgetLanguage());
    script.setAttribute("data-onauth", `${callbackName}(user)`);
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
