<script setup>
import { ref } from "vue";
import { useAdminStore } from "../store/adminStore";
import Products from "./icons/Products.vue";
import Logout from "./icons/Logout.vue";
import Statistics from "./icons/Statistics.vue";

const props = defineProps({
  mobileOpen: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["close"]);
const store = useAdminStore();

const menu = [
  { name: "Статистика", icon: Statistics },
  { name: "Продукты", icon: Products },
];

const activeItem = ref(store.showProductsView ? "Продукты" : "Статистика");

const selectMenu = (name) => {
  activeItem.value = name;

  store.showStatistics = name === "Статистика";
  store.showProductsView = name === "Продукты";
  emit("close");
};

const logout = () => {
  store.logout();
  emit("close");
};
</script>

<template>
  <Transition name="aside-fade">
    <button
      v-if="props.mobileOpen"
      type="button"
      class="aside-overlay lg:hidden"
      aria-label="Close admin menu"
      @click="emit('close')"
    />
  </Transition>

  <aside
    class="admin-aside h-screen w-64 fixed text-white flex flex-col justify-between shadow-2xl border-r border-blue-900/30"
    :class="{ 'admin-aside-open': props.mobileOpen }"
  >
    <div>
      <div class="aside-mobile-head lg:hidden">
        <p class="aside-mobile-title">Меню</p>
        <button
          type="button"
          class="aside-mobile-close"
          @click="emit('close')"
          aria-label="Close admin menu"
        >
          ×
        </button>
      </div>

      <RouterLink
        to="/"
        class="aside-brand h-24 flex flex-col items-center justify-center border-b border-white/12"
        @click="emit('close')"
      >
        <span class="aside-brand-glow" />
        <img src="@/assets/images/logo.jpg" alt="Logo" class="aside-logo w-[184px]" />
      </RouterLink>

      <div class="px-5 pt-5">
        <p class="aside-caption">Администрирование</p>
      </div>

      <nav class="mt-3 px-3">
        <ul class="space-y-2">
          <li v-for="item in menu" :key="item.name">
            <button
              @click="selectMenu(item.name)"
              class="menu-btn flex items-center w-full text-start px-4 cursor-pointer py-3 rounded-xl transition font-medium"
              :class="
                activeItem === item.name
                  ? 'menu-btn-active text-white font-semibold'
                  : 'text-indigo-100 hover:text-white'
              "
            >
              <span class="icon-wrap">
                <component :is="item.icon" :size="22" />
              </span>
              {{ item.name }}
            </button>
          </li>
        </ul>
      </nav>
    </div>

    <RouterLink to="/" class="p-4 border-t border-white/10">
      <button
        @click="logout"
        class="logout-btn flex items-center w-full px-4 py-2.5 rounded-xl transition font-semibold"
      >
        <Logout :size="25" class="mr-2" />
        Выход из системы
      </button>
    </RouterLink>
  </aside>
</template>

<style scoped>
.admin-aside {
  background:
    radial-gradient(circle at 15% 12%, rgba(31, 88, 167, 0.3), transparent 38%),
    radial-gradient(circle at 85% 84%, rgba(62, 143, 218, 0.23), transparent 40%),
    linear-gradient(180deg, #081937 0%, #0f2b66 42%, #0d2a5d 100%);
}

.aside-brand {
  position: relative;
  overflow: hidden;
}

.aside-brand-glow {
  position: absolute;
  width: 170px;
  height: 170px;
  border-radius: 999px;
  background: rgba(35, 95, 179, 0.5);
  filter: blur(40px);
  opacity: 0.6;
}

.aside-logo {
  position: relative;
  z-index: 1;
  border-radius: 14px;
  box-shadow: 0 16px 28px rgba(7, 3, 25, 0.45);
}

.aside-caption {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(213, 223, 255, 0.72);
}

.menu-btn {
  position: relative;
  border: 1px solid transparent;
}

.menu-btn:hover {
  border-color: rgba(200, 213, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
}

.menu-btn-active {
  border-color: rgba(190, 207, 255, 0.32);
  background: linear-gradient(135deg, rgba(15, 43, 102, 0.95), rgba(26, 79, 149, 0.9));
  box-shadow: 0 14px 20px rgba(6, 24, 58, 0.35);
}

.icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  margin-right: 10px;
  background: rgba(255, 255, 255, 0.08);
}

.menu-btn-active .icon-wrap {
  background: rgba(255, 255, 255, 0.2);
}

.logout-btn {
  color: #f6f8ff;
  background: linear-gradient(135deg, rgba(16, 52, 108, 0.92), rgba(30, 95, 174, 0.9));
  box-shadow: 0 14px 24px rgba(6, 24, 58, 0.36);
}

.logout-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(6, 24, 58, 0.44);
}

.aside-overlay {
  position: fixed;
  inset: 0;
  z-index: 39;
  background: rgba(7, 19, 43, 0.42);
  backdrop-filter: blur(5px);
}

.aside-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem 0.4rem;
}

.aside-mobile-title {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(223, 232, 255, 0.72);
}

.aside-mobile-close {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(220, 229, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: #f6f8ff;
  font-size: 1.35rem;
}

.aside-fade-enter-active,
.aside-fade-leave-active {
  transition: opacity 0.25s ease;
}

.aside-fade-enter-from,
.aside-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1023px) {
  .admin-aside {
    z-index: 40;
    transform: translateX(-105%);
    transition: transform 0.28s ease;
  }

  .admin-aside-open {
    transform: translateX(0);
  }
}
</style>
