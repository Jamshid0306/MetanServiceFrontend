<script setup>
import Header from "../views/HomePage/Header.vue";
import ProductsView from "../views/HomePage/ProductsView.vue";
import ContactSection from "../views/HomePage/ContactSection.vue";
</script>
<template>
  <div class="home-shell relative overflow-hidden border-b border-blue-100/70">
    <span class="home-aura home-aura-left" />
    <span class="home-aura home-aura-right" />
    <div class="relative z-10">
      <Header />
    </div>
  </div>
  <ProductsView />
  <ContactSection />
</template>

<style scoped>
.home-shell {
  background: linear-gradient(180deg, #ffffff 0%, #f3f8ff 52%, #f8fbff 100%);
}

.home-aura {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
  filter: blur(54px);
  opacity: 0.26;
  animation: drift 18s ease-in-out infinite;
}

.home-aura-left {
  width: 280px;
  height: 280px;
  left: -90px;
  top: 40px;
  background: rgba(24, 79, 149, 0.25);
}

.home-aura-right {
  width: 260px;
  height: 260px;
  right: -80px;
  top: 10px;
  background: rgba(62, 143, 218, 0.2);
  animation-delay: 2s;
}

@keyframes drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(8px, -10px, 0);
  }
}
</style>
