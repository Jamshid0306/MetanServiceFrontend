<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { apiClient, getApiErrorMessage } from "@/lib/api";
import { normalizeCustomerPhone } from "@/lib/customerSession";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const verifiedPhone = ref("");
const resetToken = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const submitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const telegramSectionDisabled = true;

const isReadyForPassword = computed(
  () => telegramSectionDisabled || Boolean(verifiedPhone.value)
);
const canSubmit = computed(
  () =>
    isReadyForPassword.value &&
    newPassword.value.trim().length >= 8 &&
    newPassword.value === confirmPassword.value
);

const submitNewPassword = async () => {
  if (!canSubmit.value) {
    if (!newPassword.value.trim() || !confirmPassword.value.trim()) {
      errorMessage.value = t("auth.fillRequired");
    } else if (!telegramSectionDisabled && !verifiedPhone.value.trim()) {
      errorMessage.value = t("auth.resetNoPhone");
    } else if (newPassword.value.trim().length < 8) {
      errorMessage.value = t("auth.passwordTooShort");
    } else if (newPassword.value !== confirmPassword.value) {
      errorMessage.value = t("auth.passwordsDontMatch");
    }
    return;
  }

  submitting.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    await apiClient.post("/customers/reset-password", {
      phone: verifiedPhone.value,
      password: newPassword.value.trim(),
      reset_token: resetToken.value || undefined,
    });

    successMessage.value = t("auth.resetSuccess");

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("auth.registerFailed"));
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="min-h-[calc(100vh-180px)] px-4 pt-28 pb-12 sm:pt-24">
    <div class="mx-auto max-w-5xl">
      <div
        class="mx-auto w-full max-w-md rounded-[28px] border border-slate-900/10 bg-gradient-to-b from-slate-50 to-slate-100 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-6"
      >
        <p
          class="text-[0.72rem] font-extrabold tracking-[0.14em] uppercase text-[#6a7d71]"
        >
          {{ t("auth.userAccess") }}
        </p>
        <h1
          class="mt-1 text-[clamp(1.7rem,3vw,2.3rem)] font-extrabold text-[#142338]"
        >
          {{ t("auth.resetTitle") }}
        </h1>
        <p class="mt-2 text-slate-500 leading-relaxed">
          {{ t("auth.resetSubtitle") }}
        </p>

        <form
          v-if="isReadyForPassword"
          class="mt-5 grid gap-4"
          @submit.prevent="submitNewPassword"
        >
          <div
            v-if="!telegramSectionDisabled"
            class="flex items-center justify-between text-[0.9rem] text-slate-700"
          >
            <span>{{ t("phone") }}:</span>
            <strong class="font-semibold">+{{ verifiedPhone }}</strong>
          </div>

          <label class="grid gap-1.5">
            <span class="text-[0.86rem] font-semibold text-slate-800">
              {{ t("auth.newPassword") }}
            </span>
            <input
              v-model="newPassword"
              type="password"
              :placeholder="t('auth.newPasswordPlaceholder')"
              class="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#18304f] focus:ring-4 focus:ring-[#18304f]/15"
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-[0.86rem] font-semibold text-slate-800">
              {{ t("auth.confirmPassword") }}
            </span>
            <input
              v-model="confirmPassword"
              type="password"
              :placeholder="t('auth.confirmPasswordPlaceholder')"
              class="w-full rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#18304f] focus:ring-4 focus:ring-[#18304f]/15"
            />
          </label>

          <p
            v-if="errorMessage"
            class="text-[0.92rem] font-semibold text-red-600"
          >
            {{ errorMessage }}
          </p>

          <p
            v-if="successMessage"
            class="text-[0.92rem] font-semibold text-emerald-600"
          >
            {{ successMessage }}
          </p>

          <button
            type="submit"
            class="mt-1 inline-flex w-full items-center justify-center rounded-[18px] border border-[#18304f] bg-[#18304f] px-5 py-3 text-sm font-extrabold text-white transition hover:border-[#12263d] hover:bg-[#12263d] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting"
          >
            {{ submitting ? t("sending") : t("auth.resetSubmit") }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
