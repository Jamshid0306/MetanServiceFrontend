<script setup>
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { Check, CircleAlert } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
const {t} = useI18n()

const props = defineProps({
  message: String,
  show: Boolean,
  showBasketAction: {
    type: Boolean,
    default: true,
  },
  duration: {
    type: Number,
    default: 3000,
  },
  variant: {
    type: String,
    default: "success",
  },
});

const emit = defineEmits(["close"]);
const visible = ref(props.show);
const timer = ref(null);
const isHovered = ref(false);
const router = useRouter();

const isError = computed(() => props.variant === "error");
const toastClass = computed(() =>
  isError.value
    ? "border-red-200 bg-white/96 shadow-[0_18px_40px_rgba(127,29,29,0.16)]"
    : "border-slate-200 bg-white/96 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
);
const iconWrapClass = computed(() =>
  isError.value ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
);
const titleClass = computed(() => (isError.value ? "text-red-950" : "text-slate-800"));
const actionClass = computed(() =>
  isError.value
    ? "text-red-700 hover:text-red-900"
    : "text-slate-700 hover:text-slate-950"
);

const startTimer = () => {
  clearTimeout(timer.value);
  if (!isHovered.value) {
    timer.value = setTimeout(() => {
      visible.value = false;
      emit("close");
    }, props.duration);
  }
};

const clearTimer = () => {
  clearTimeout(timer.value);
};

watch(
  () => props.show,
  (newVal) => {
    visible.value = newVal;
    if (newVal) startTimer();
  },
  { immediate: true }
);

const goToBasket = () => {
  router.push({ name: "Basket" });
};

onBeforeUnmount(() => {
  clearTimeout(timer.value);
});
</script>

<template>
  <transition name="toast-slide">
    <div
      v-if="visible"
      class="fixed top-6 right-6 z-[9999] flex w-full max-w-xs items-start gap-3 rounded-2xl border p-4 backdrop-blur-md"
      :class="toastClass"
      @mouseenter="isHovered = true; clearTimer()"
      @mouseleave="isHovered = false; startTimer()"
    >
      <div class="rounded-full p-2" :class="iconWrapClass">
        <Check v-if="!isError" class="h-6 w-6" />
        <CircleAlert v-else class="h-6 w-6" />
      </div>
      <div>
        <p class="font-semibold leading-snug" :class="titleClass">
          {{ message }}
        </p>
        <button
          v-if="showBasketAction"
          @click="goToBasket"
          class="mt-2 text-sm font-medium transition-colors"
          :class="actionClass"
        >
          {{ t('go_to_basket') }} →
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-30px) scale(0.95);
}
.toast-slide-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.toast-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(0.95);
}
</style>
