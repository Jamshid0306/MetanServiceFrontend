<script setup>
import Header from "../views/HomePage/Header.vue";
import ProductsView from "../views/HomePage/ProductsView.vue";
import ContactSection from "../views/HomePage/ContactSection.vue";
</script>
<template>
  <div class="home-shell relative overflow-hidden">
    <div class="relative z-10">
      <Header />
    </div>
  </div>
  <ProductsView />
  <ContactSection />
</template>

<style scoped>
.home-shell {
  border-bottom: 1px solid rgba(20, 35, 56, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(245, 247, 250, 0.7));
}
</style>
