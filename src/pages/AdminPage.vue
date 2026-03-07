<script setup>
import Login from "../components/Login.vue";
import Aside from "../components/Aside.vue";
import ProductsView from "../views/AdminPage/ProductsView.vue";
import StatisticsView from "../views/AdminPage/StatisticsView.vue";
import { useAdminStore } from "../store/adminStore";

const store = useAdminStore();
</script>

<template>
  <div class="flex">
    <Login v-if="!store.isLogged" class="flex-1" />
    <template v-else>
      <Aside />
      <main class="flex-1 p-6 bg-gray-50 ml-[250px]">
        <StatisticsView v-if="store.showStatistics" />
        <ProductsView v-else-if="store.showProductsView" />
      </main>
    </template>
  </div>
</template>
