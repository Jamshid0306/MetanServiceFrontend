<script setup>
import Login from "../components/Login.vue";
import ProductsView from "../views/AdminPage/ProductsView.vue";
import { useAdminStore } from "../store/adminStore";

const store = useAdminStore();
</script>

<template>
  <div class="admin-shell flex min-h-screen">
    <Login v-if="!store.isLogged" class="flex-1" />
    <template v-else>
      <main class="admin-main flex-1 min-w-0">
        <header class="admin-header">
          <div>
            <p class="admin-mobile-label">Панель</p>
            <h1 class="admin-mobile-title">Администрирование</h1>
          </div>
        </header>

        <div class="admin-content p-4 sm:p-6">
          <ProductsView />
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

.admin-header {
  padding: 1.25rem 1rem 0;
  background: linear-gradient(180deg, rgba(238, 244, 251, 0.96), rgba(238, 244, 251, 0.72));
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
