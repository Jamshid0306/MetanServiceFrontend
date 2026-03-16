<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-[#0b2559] to-black relative overflow-hidden">
    <!-- Gradient Background Blobs -->
    <div class="absolute -top-20 -left-20 w-96 h-96 bg-blue-600 rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>
    <div class="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-float-slow"></div>

    <!-- Card -->
    <div class="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 p-10">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-400 shadow-lg mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h2 class="text-3xl font-extrabold text-white">Admin Login</h2>
        <p class="mt-2 text-sm text-blue-200">Please enter your credentials</p>
      </div>

      <!-- Form -->
      <form class="space-y-6" @submit.prevent="handleLogin">
        <p
          v-if="adminStore.lastError"
          class="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {{ adminStore.lastError }}
        </p>

        <!-- Username -->
        <div>
          <label for="username" class="block text-sm font-medium text-blue-100 mb-1">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            class="w-full px-4 py-3 rounded-lg bg-white/10 border border-blue-400/20 text-white placeholder-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition"
            placeholder="Enter username"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-blue-100 mb-1">Password</label>
          <div class="relative">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full px-4 py-3 rounded-lg bg-white/10 border border-blue-400/20 text-white placeholder-blue-200 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition pr-10"
              placeholder="Enter password"
            />
            <button type="button" class="absolute inset-y-0 right-3 flex items-center text-blue-300 hover:text-white transition"
              @click="showPassword = !showPassword">
              <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029M15 12a3 3 0 01-6 0"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9.878 9.878l4.242 4.242M9.88 9.88L3 3m6.88 6.88L21 21"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Button -->
        <button type="submit" :disabled="loading"
          class="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-medium shadow-lg transition transform hover:scale-[1.02] focus:ring-2 focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed">
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.3 0 0 5.3 0 12h4z"/>
            </svg>
            Signing in...
          </span>
          <span v-else>Sign In</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useAdminStore } from "@/store/adminStore";
import { useRouter } from "vue-router";

const router = useRouter();
const adminStore = useAdminStore();

const username = ref("");
const password = ref("");
const loading = ref(false);
const showPassword = ref(false);

const handleLogin = async () => {
  loading.value = true;
  adminStore.lastError = "";
  const success = await adminStore.login(username.value, password.value);
  
  loading.value = false;
  if (success) {
    router.push("/admin");
  } else {
    alert(adminStore.lastError || "❌ Login yoki parol noto‘g‘ri!");
  }
};
</script>

<style scoped>
@keyframes float-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}
.animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
</style>
