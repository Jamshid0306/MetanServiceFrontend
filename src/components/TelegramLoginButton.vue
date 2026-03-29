<script setup>
import { computed, onBeforeUnmount, onMounted } from "vue";

const emit = defineEmits(["auth", "error"]);

const botUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim();

const widgetSrc = computed(() => {
  if (!botUsername) {
    return "";
  }

  const params = new URLSearchParams({
    bot: botUsername,
  });

  return `/telegram-login-widget.html?${params.toString()}`;
});

const handleMessage = (event) => {
  if (typeof window === "undefined") {
    return;
  }

  if (event.origin !== window.location.origin) {
    return;
  }

  const payload = event.data || {};
  if (payload?.source !== "telegram-login-widget") {
    return;
  }

  if (payload.type === "auth" && payload.user) {
    emit("auth", payload.user);
    return;
  }

  if (payload.type === "error") {
    emit("error", payload.message || "Telegram tugmasini yuklab bo'lmadi.");
  }
};

onMounted(() => {
  if (!botUsername) {
    emit("error", "Telegram login hozircha sozlanmagan.");
    return;
  }

  window.addEventListener("message", handleMessage);
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("message", handleMessage);
  }
});
</script>

<template>
  <div class="telegram-widget-frame-wrap">
    <iframe
      v-if="widgetSrc"
      :src="widgetSrc"
      title="Telegram login"
      class="telegram-widget-frame"
      loading="eager"
    />
  </div>
</template>

<style scoped>
.telegram-widget-frame-wrap {
  display: grid;
  justify-items: center;
}

.telegram-widget-frame {
  width: 100%;
  max-width: 320px;
  height: 64px;
  border: 0;
  background: transparent;
}
</style>
