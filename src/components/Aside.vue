<script setup>
import { ref } from "vue";
import { useAdminStore } from "../store/adminStore";
import Products from "./icons/Products.vue";
import Logout from "./icons/Logout.vue";
import Statistics from "./icons/Statistics.vue";

const store = useAdminStore();

const menu = [
  { name: "Статистика", icon: Statistics },
  { name: "Продукты", icon: Products },
];

const activeItem = ref("Статистика");

const selectMenu = (name) => {
  activeItem.value = name;

  store.showStatistics = name === "Статистика";
  store.showProductsView = name === "Продукты";
};

const logout = () => store.logout();
</script>

<template>
  <aside
    class="admin-aside h-screen w-64 fixed text-white flex flex-col justify-between shadow-2xl border-r border-blue-900/30"
  >
    <div>
      <RouterLink
        to="/"
        class="aside-brand h-24 flex flex-col items-center justify-center border-b border-white/12"
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
</style>
