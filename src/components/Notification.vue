<script setup>
import { ref, watch, onBeforeUnmount } from "vue";
import { Check } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
const {t} = useI18n()

const props = defineProps({
  message: String,
  show: Boolean,
  duration: {
    type: Number,
    default: 3000,
  },
});

const emit = defineEmits(["close"]);
const visible = ref(props.show);
const timer = ref(null);
const isHovered = ref(false);
const router = useRouter();

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
      class="fixed top-6 right-6 z-[9999] flex w-full max-w-xs items-start gap-3 rounded-2xl border border-slate-200 bg-white/96 p-4 backdrop-blur-md"
      @mouseenter="isHovered = true; clearTimer()"
      @mouseleave="isHovered = false; startTimer()"
    >
      <div class="rounded-full bg-slate-100 p-2">
        <Check class="h-6 w-6 text-slate-700" />
      </div>
      <div>
        <p class="font-semibold leading-snug text-slate-800">
          {{ message }}
        </p>
        <button
          @click="goToBasket"
          class="mt-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950"
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
