<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import Header from "../views/HomePage/Header.vue";
import ProductsView from "../views/HomePage/ProductsView.vue";

const route = useRoute();
const hasSearchQuery = computed(() => String(route.query.search || "").trim().length > 0);
</script>
<template>
  <div v-if="!hasSearchQuery" class="home-shell relative">
    <div class="relative z-10">
      <Header />
    </div>
  </div>
  <ProductsView />
</template>

<style scoped>
.home-shell {
  border-bottom: 1px solid rgba(20, 35, 56, 0.08);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(245, 247, 250, 0.7));
}
</style>
