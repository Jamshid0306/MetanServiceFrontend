<template>
  <div
    class="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-[9999]"
  >
    <div class="flex flex-col items-center gap-4">
      <div
        class="w-16 h-16 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"
      ></div>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
