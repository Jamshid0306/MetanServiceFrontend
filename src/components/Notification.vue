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
      class="fixed top-6 right-6 max-w-xs w-full bg-gradient-to-r from-green-50 to-white shadow-2xl rounded-2xl p-4 flex items-start gap-3 border border-green-200 z-[9999]"
      @mouseenter="isHovered = true; clearTimer()"
      @mouseleave="isHovered = false; startTimer()"
    >
      <div class="bg-green-100 p-2 rounded-full">
        <Check class="w-6 h-6 text-green-600" />
      </div>
      <div>
        <p class="text-gray-800 font-semibold leading-snug">
          {{ message }}
        </p>
        <button
          @click="goToBasket"
          class="text-green-700 font-medium text-sm mt-2 hover:underline transition-colors"
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
