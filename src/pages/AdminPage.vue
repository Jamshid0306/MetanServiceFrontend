<script setup>
import { ref } from "vue";
import Login from "../components/Login.vue";
import Aside from "../components/Aside.vue";
import ProductsView from "../views/AdminPage/ProductsView.vue";
import StatisticsView from "../views/AdminPage/StatisticsView.vue";
import { useAdminStore } from "../store/adminStore";

const store = useAdminStore();
const isSidebarOpen = ref(false);
</script>

<template>
  <div class="admin-shell flex min-h-screen">
    <Login v-if="!store.isLogged" class="flex-1" />
    <template v-else>
      <Aside :mobile-open="isSidebarOpen" @close="isSidebarOpen = false" />
      <main class="admin-main flex-1 min-w-0 lg:ml-64">
        <header class="admin-mobile-bar lg:hidden">
          <button
            type="button"
            @click="isSidebarOpen = true"
            class="admin-mobile-toggle"
            aria-label="Open admin menu"
          >
            <span />
            <span />
            <span />
          </button>
          <div>
            <p class="admin-mobile-label">Панель</p>
            <h1 class="admin-mobile-title">Администрирование</h1>
          </div>
        </header>

        <div class="admin-content p-4 sm:p-6">
          <StatisticsView v-if="store.showStatistics" />
          <ProductsView v-else-if="store.showProductsView" />
        </div>
      </main>
    </template>
  </div>
</template>

<style scoped>
.admin-shell {
  background:
    radial-gradient(circle at top right, rgba(35, 95, 179, 0.08), transparent 28%),
    linear-gradient(180deg, #eef4fb 0%, #f7f9fc 100%);
}

.admin-main {
  position: relative;
}

.admin-mobile-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 1rem 1rem 0;
  background: linear-gradient(180deg, rgba(238, 244, 251, 0.96), rgba(238, 244, 251, 0.72));
  backdrop-filter: blur(14px);
}

.admin-mobile-toggle {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: rgba(255, 255, 255, 0.92);
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  box-shadow: 0 12px 24px rgba(8, 30, 72, 0.08);
}

.admin-mobile-toggle span {
  width: 18px;
  height: 2px;
  border-radius: 999px;
  background: #173c74;
}

.admin-mobile-label {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b7f9b;
}

.admin-mobile-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #14315f;
}

.admin-content {
  position: relative;
  z-index: 1;
}
</style>
