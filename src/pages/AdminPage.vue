<script setup>
import Login from "../components/Login.vue";
import HeroSlidesView from "../views/AdminPage/HeroSlidesView.vue";
import ProductsView from "../views/AdminPage/ProductsView.vue";
import ServicesView from "../views/AdminPage/ServicesView.vue";
import { useAdminStore } from "../store/adminStore";

const store = useAdminStore();

void store.restoreSession();
</script>

<template>
  <div class="admin-shell flex min-h-screen">
    <div v-if="store.isRestoringSession" class="admin-session-state flex-1">
      <div class="admin-session-card">
        <p class="admin-mobile-label">Панель</p>
        <h1 class="admin-mobile-title">Sessiya tekshirilmoqda</h1>
        <p class="admin-session-copy">Admin sessiyasi yangilanmoqda, biroz kuting.</p>
      </div>
    </div>
    <Login v-else-if="!store.isLogged" class="flex-1" />
    <template v-else>
      <main class="admin-main flex-1 min-w-0">
        <header class="admin-header">
          <div>
            <p class="admin-mobile-label">Панель</p>
            <h1 class="admin-mobile-title">Администрирование</h1>
          </div>
        </header>

        <div class="admin-content p-4 sm:p-6">
          <HeroSlidesView />
          <ServicesView />
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

.admin-session-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.admin-session-card {
  width: min(420px, 100%);
  border: 1px solid rgba(20, 49, 95, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 40px rgba(20, 49, 95, 0.08);
  padding: 1.5rem;
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

.admin-session-copy {
  margin-top: 0.5rem;
  color: #5f7290;
  font-size: 0.95rem;
}

.admin-content {
  position: relative;
  z-index: 1;
}
</style>
