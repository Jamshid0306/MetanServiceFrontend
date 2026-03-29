<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits(["auth", "error"]);

const { locale, t } = useI18n();
const widgetRef = ref(null);
const callbackName = `telegramLoginCallback_${Math.random().toString(36).slice(2)}`;
const botUsername = String(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "").trim();
const isConfigured = computed(() => Boolean(botUsername));
let renderCheckTimer = null;
const widgetLang = computed(() => {
  if (locale.value === "ru") {
    return "ru";
  }

  if (locale.value === "en") {
    return "en";
  }

  return "en";
});

const clearRenderCheckTimer = () => {
  if (typeof window !== "undefined" && renderCheckTimer) {
    window.clearTimeout(renderCheckTimer);
    renderCheckTimer = null;
  }
};

const renderWidget = async () => {
  await nextTick();

  if (!widgetRef.value || !isConfigured.value || typeof window === "undefined") {
    return;
  }

  clearRenderCheckTimer();
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
  script.setAttribute("data-lang", widgetLang.value);
  script.setAttribute("data-onauth", `${callbackName}(user)`);
  script.onload = () => {
    clearRenderCheckTimer();
    renderCheckTimer = window.setTimeout(() => {
      const hasRenderedIframe = Boolean(widgetRef.value?.querySelector("iframe"));
      const hasRenderedButton = Boolean(widgetRef.value?.querySelector("script + *"));

      if (!hasRenderedIframe && !hasRenderedButton) {
        emit("error", t("auth.telegramLoadError"));
      }
    }, 1200);
  };
  script.onerror = () => {
    clearRenderCheckTimer();
    emit("error", t("auth.telegramLoadError"));
  };
  script.src = "https://telegram.org/js/telegram-widget.js?22";

  widgetRef.value.appendChild(script);
};

onMounted(() => {
  renderWidget();
});

watch(locale, () => {
  renderWidget();
});

onBeforeUnmount(() => {
  clearRenderCheckTimer();
  if (typeof window !== "undefined") {
    delete window[callbackName];
  }
});
</script>

<template>
  <div class="telegram-login-wrap">
    <div v-if="isConfigured" ref="widgetRef" class="telegram-widget-host" />
    <div v-else class="telegram-login-disabled">
      {{ t("auth.telegramUnavailable") }}
    </div>
  </div>
</template>

<style scoped>
.telegram-login-wrap {
  display: grid;
  justify-items: center;
}

.telegram-widget-host {
  min-height: 42px;
}

.telegram-login-disabled {
  width: 100%;
  border-radius: 16px;
  border: 1px dashed rgba(20, 35, 56, 0.14);
  background: rgba(255, 255, 255, 0.72);
  color: #64748b;
  font-size: 0.92rem;
  text-align: center;
  padding: 0.9rem 1rem;
}
</style>
