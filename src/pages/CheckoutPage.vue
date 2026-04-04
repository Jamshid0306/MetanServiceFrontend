<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { CircleCheckBig, Clock3, CreditCard, RefreshCw, ShoppingCart } from "lucide-vue-next";

import LeftArrow from "@/components/icons/LeftArrow.vue";
import { apiClient, getApiErrorMessage, resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import {
  formatCylinderCountLabel,
  formatCylinderOptionLabel,
  formatPriceValue,
  getBasketPrice,
  hasCreditPricing,
  parseNumericPrice,
} from "@/lib/productOptions";
import {
  formatUzbekistanPhoneInput,
  getStoredCustomerSession,
  normalizeCustomerPhone,
} from "@/lib/customerSession";
import { useBasketStore } from "@/store/basketStore";

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const basketStore = useBasketStore();

basketStore.normalizeBasket();
const customerSession = ref(null);

const checkoutForm = ref({
  name: "",
  phone: "+998",
  paymentMethod: "click",
  myIdPinfl: "",
  myIdPassport: "",
  myIdBirthDate: "",
});
const pageError = ref("");
const submitting = ref(false);
const clickMeta = ref({
  enabled: false,
});
const myIdMeta = ref({
  enabled: false,
});
const orderStatus = ref(null);
const orderStatusError = ref("");
const orderStatusLoading = ref(false);
const myIdFinalizeLoading = ref(false);
const myIdSessionResultLoading = ref(false);
const myIdReturnProcessedKey = ref("");
const myIdResolvedAuthCode = ref("");
const myIdProfileResult = ref(null);
const myIdResultNote = ref("");
const myIdJobId = ref("");
let statusPollTimeoutId = null;

const basketItems = computed(() => basketStore.basket);
const readSingleQueryValue = (value) => (Array.isArray(value) ? value[0] : value);
const currentOrderId = computed(() => {
  const rawValue = route.query.order_id;
  const normalized = readSingleQueryValue(rawValue);
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
});
const myIdReturnAuthCode = computed(() => String(readSingleQueryValue(route.query.auth_code) || "").trim());
const myIdReturnSessionId = computed(() => String(readSingleQueryValue(route.query.session_id) || "").trim());
const myIdReturnReasonCode = computed(() => {
  const rawValue = readSingleQueryValue(route.query.reason_code ?? route.query.result_code);
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : null;
});
const effectiveMyIdAuthCode = computed(() => myIdReturnAuthCode.value || myIdResolvedAuthCode.value);
const showMyIdResultCard = computed(() => Boolean(myIdProfileResult.value));
const formattedMyIdProfile = computed(() =>
  myIdProfileResult.value ? JSON.stringify(myIdProfileResult.value, null, 2) : ""
);

const normalizeImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) {
    return resolveAssetUrls(images);
  }
  const resolved = resolveAssetUrl(images);
  return resolved ? [resolved] : [];
};

const formatSelectedOptionLabel = (option) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return "";
  }

  const countLabel = formatCylinderCountLabel(option?.count);
  if (option?.group_key === "cylinder_volume" && countLabel) {
    return formatCylinderOptionLabel(option);
  }

  return label;
};

const productsPayload = computed(() =>
  basketItems.value.map((item) => ({
    id: item.id,
    name: item?.[`name_${locale.value}`] || item?.name_uz || item?.name_ru || item?.name_en || "",
    quantity: Number(item?.quantity || 1),
    selected_options: Array.isArray(item?.selected_options) ? item.selected_options : [],
  }))
);

const basketHasInvalidPrice = computed(() =>
  basketItems.value.some((item) => parseNumericPrice(getBasketPrice(item, locale.value)) === null)
);

const totalAmount = computed(() =>
  basketItems.value.reduce((sum, item) => {
    const numeric = parseNumericPrice(getBasketPrice(item, locale.value));
    return numeric === null ? sum : sum + numeric;
  }, 0)
);

const totalAmountFormatted = computed(() => formatPriceValue(totalAmount.value));
const canShowCheckoutForm = computed(() => basketItems.value.length > 0);
const basketSupportsInstallment = computed(() =>
  basketItems.value.every((item) => hasCreditPricing(item))
);
const canSubmitOrder = computed(
  () =>
    canShowCheckoutForm.value &&
    !basketHasInvalidPrice.value &&
    totalAmount.value > 0 &&
    !submitting.value
);
const showStatusCard = computed(() => Boolean(currentOrderId.value && orderStatus.value));
const showMyIdConfirmCard = computed(
  () => Boolean(myIdReturnSessionId.value && effectiveMyIdAuthCode.value)
);
const isCustomerLocked = computed(
  () =>
    Boolean(customerSession.value?.name) &&
    normalizeCustomerPhone(customerSession.value?.phone).length === 12
);
const myIdDisabledReason = computed(() => {
  if (!myIdMeta.value.enabled) {
    return t("checkoutPage.myidUnavailable");
  }

  if (!basketSupportsInstallment.value) {
    return t("checkoutPage.installmentUnavailable");
  }

  return "";
});
const submitButtonLabel = computed(() =>
  checkoutForm.value.paymentMethod === "myid"
    ? t("checkoutPage.submitMyId")
    : t("checkoutPage.submitClick")
);
const currentStatusPaymentMethod = computed(() =>
  String(orderStatus.value?.payment_method || checkoutForm.value.paymentMethod || "click")
    .trim()
    .toLowerCase()
);

const currentStatusVariant = computed(() => {
  const status = String(orderStatus.value?.status || "").trim().toLowerCase();
  if (status === "completed") return "success";
  if (status === "cancelled") return "error";
  return "pending";
});

const currentStatusTitle = computed(() => {
  const status = String(orderStatus.value?.status || "").trim().toLowerCase();
  if (currentStatusPaymentMethod.value === "myid") {
    if (status === "completed") return t("checkoutPage.myidStatusCompleted");
    if (status === "cancelled") return t("checkoutPage.myidStatusCancelled");
    if (status === "pending") return t("checkoutPage.myidStatusPending");
    return t("checkoutPage.myidStatusUnknown");
  }

  if (status === "prepared") return t("checkoutPage.statusPrepared");
  if (status === "completed") return t("checkoutPage.statusCompleted");
  if (status === "cancelled") return t("checkoutPage.statusCancelled");
  if (status === "pending") return t("checkoutPage.statusPending");
  return t("checkoutPage.statusUnknown");
});

const currentStatusHint = computed(() => {
  const status = String(orderStatus.value?.status || "").trim().toLowerCase();
  const statusNote = String(orderStatus.value?.status_note || orderStatus.value?.click_error_note || "").trim();

  if (currentStatusPaymentMethod.value === "myid") {
    if (status === "completed") return statusNote || t("checkoutPage.myidHintCompleted");
    if (status === "cancelled") return statusNote || t("checkoutPage.myidHintCancelled");
    return statusNote || t("checkoutPage.myidHintPending");
  }

  if (status === "prepared") return t("checkoutPage.statusHintPrepared");
  if (status === "completed") return t("checkoutPage.statusHintCompleted");
  if (status === "cancelled") return statusNote || t("checkoutPage.statusHintCancelled");
  return t("checkoutPage.statusHintPending");
});

const stopStatusPolling = () => {
  if (statusPollTimeoutId) {
    clearTimeout(statusPollTimeoutId);
    statusPollTimeoutId = null;
  }
};

const scheduleStatusPolling = () => {
  stopStatusPolling();
  const status = String(orderStatus.value?.status || "").trim().toLowerCase();
  if (!currentOrderId.value || !["pending", "prepared"].includes(status)) {
    return;
  }

  statusPollTimeoutId = window.setTimeout(() => {
    fetchOrderStatus();
  }, 4000);
};

const applyStoredCustomerSession = () => {
  const session = getStoredCustomerSession();
  customerSession.value = session;

  if (!session) {
    return;
  }

  checkoutForm.value.name = session.name || "";
  checkoutForm.value.phone = formatUzbekistanPhoneInput(session.phone || "");
};

const fetchClickMeta = async () => {
  try {
    const response = await apiClient.get("/payments/click/meta");
    clickMeta.value = {
      enabled: Boolean(response.data?.enabled),
    };
  } catch {
    clickMeta.value = {
      enabled: false,
    };
  }
};

const fetchMyIdMeta = async () => {
  try {
    const response = await apiClient.get("/payments/myid/meta");
    myIdMeta.value = {
      enabled: Boolean(response.data?.enabled),
    };
  } catch {
    myIdMeta.value = {
      enabled: false,
    };
  }
};

const fetchOrderStatus = async () => {
  if (!currentOrderId.value) {
    orderStatus.value = null;
    return;
  }

  orderStatusLoading.value = true;
  orderStatusError.value = "";

  try {
    const response = await apiClient.get(`/payments/orders/${currentOrderId.value}`);
    orderStatus.value = response.data || null;

    if (String(orderStatus.value?.status || "").trim().toLowerCase() === "completed") {
      basketStore.clearBasket();
    }

    scheduleStatusPolling();
  } catch (error) {
    orderStatusError.value = getApiErrorMessage(error, t("send"));
    stopStatusPolling();
  } finally {
    orderStatusLoading.value = false;
  }
};

const normalizeMyIdPinflInput = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 14);

const normalizeMyIdPassportInput = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

const replaceCheckoutQuery = async (nextQuery = {}) => {
  await router.replace({
    path: route.path,
    query: nextQuery,
  });
};

const resetTransientMyIdState = () => {
  myIdResolvedAuthCode.value = "";
  myIdProfileResult.value = null;
  myIdResultNote.value = "";
  myIdJobId.value = "";
};

const finalizeMyIdReturn = async () => {
  const sessionId = myIdReturnSessionId.value;
  const authCode = effectiveMyIdAuthCode.value;

  if (!sessionId || !authCode) {
    return;
  }

  pageError.value = "";
  myIdFinalizeLoading.value = true;

  try {
    const response = await apiClient.post("/payments/myid/finalize", {
      session_id: sessionId,
      auth_code: authCode,
    });
    myIdProfileResult.value = response.data?.profile || null;
    myIdResultNote.value = String(response.data?.result_note || "").trim();
    myIdJobId.value = String(response.data?.job_id || "").trim();
    await replaceCheckoutQuery({});
  } catch (error) {
    pageError.value = getApiErrorMessage(error, t("send"));
  } finally {
    myIdFinalizeLoading.value = false;
  }
};

const fetchMyIdSessionResult = async () => {
  const sessionId = myIdReturnSessionId.value;
  if (!sessionId || myIdReturnReasonCode.value !== null || effectiveMyIdAuthCode.value) {
    return;
  }

  myIdSessionResultLoading.value = true;

  try {
    const response = await apiClient.post(`/payments/myid/sessions/${sessionId}/result`);
    myIdResolvedAuthCode.value = String(response.data?.auth_code || "").trim();
  } catch (error) {
    pageError.value = getApiErrorMessage(error, t("send"));
  } finally {
    myIdSessionResultLoading.value = false;
  }
};

const openMyIdBlankTab = () => {
  const popup = window.open("about:blank", "_blank");
  if (popup) {
    popup.opener = null;
    popup.document.write(`
      <!doctype html>
      <html lang="uz">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>MyID</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              font-family: Arial, sans-serif;
              background: #f8fafc;
              color: #0f172a;
            }
            .myid-loading {
              text-align: center;
              padding: 24px;
            }
            .myid-loading strong {
              display: block;
              margin-bottom: 8px;
              font-size: 18px;
            }
            .myid-loading span {
              color: #475569;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="myid-loading">
            <strong>MyID yuklanmoqda...</strong>
            <span>Sahifa tayyor bo‘lgach avtomatik ochiladi.</span>
          </div>
        </body>
      </html>
    `);
    popup.document.close();
  }
  return popup;
};

const submitCheckout = async () => {
  pageError.value = "";
  resetTransientMyIdState();

  if (!canShowCheckoutForm.value) {
    pageError.value = t("checkoutPage.emptyAction");
    return;
  }

  if (basketHasInvalidPrice.value) {
    pageError.value = t("checkoutPage.invalidPrice");
    return;
  }

  if (totalAmount.value <= 0) {
    pageError.value = t("checkoutPage.invalidPrice");
    return;
  }

  const name = String(checkoutForm.value.name || "").trim();
  const phone = normalizeCustomerPhone(checkoutForm.value.phone);

  if (!name || phone.length !== 12) {
    pageError.value = t("please_fill_all_fields");
    return;
  }

  const payload = {
    name,
    phone,
    locale: locale.value,
    total: totalAmount.value,
    products: productsPayload.value,
  };

  submitting.value = true;
  let myIdTab = null;

  try {
    if (checkoutForm.value.paymentMethod === "myid") {
      if (myIdDisabledReason.value) {
        pageError.value = myIdDisabledReason.value;
        return;
      }

      const pinfl = normalizeMyIdPinflInput(checkoutForm.value.myIdPinfl);
      const passData = normalizeMyIdPassportInput(checkoutForm.value.myIdPassport);
      const birthDate = String(checkoutForm.value.myIdBirthDate || "").trim();

      if ((!pinfl && !passData) || !birthDate) {
        pageError.value = t("checkoutPage.myidMissingIdentity");
        return;
      }

      myIdTab = openMyIdBlankTab();
      const response = await apiClient.post("/payments/myid/initiate", {
        ...payload,
        pinfl: pinfl || null,
        pass_data: passData || null,
        birth_date: birthDate,
        lang: locale.value,
      });
      const redirectUrl = String(response.data?.redirect_url || "").trim();

      if (!redirectUrl) {
        throw new Error("MyID redirect URL was not returned");
      }

      if (myIdTab && !myIdTab.closed) {
        myIdTab.location.replace(redirectUrl);
      } else {
        window.open(redirectUrl, "_blank") || (window.location.href = redirectUrl);
      }
      return;
    }

    if (!clickMeta.value.enabled) {
      pageError.value = t("checkoutPage.clickUnavailable");
      return;
    }

    const response = await apiClient.post("/payments/click/initiate", {
      ...payload,
      return_url: `${window.location.origin}/checkout`,
    });
    const paymentUrl = String(response.data?.payment_url || "").trim();

    if (!paymentUrl) {
      throw new Error("Payment URL was not returned");
    }

    window.location.href = paymentUrl;
  } catch (error) {
    if (myIdTab && !myIdTab.closed) {
      myIdTab.close();
    }
    pageError.value = getApiErrorMessage(error, t("send"));
  } finally {
    submitting.value = false;
  }
};

watch(
  () => currentOrderId.value,
  () => {
    if (!currentOrderId.value) {
      stopStatusPolling();
      orderStatus.value = null;
      orderStatusError.value = "";
      return;
    }
    fetchOrderStatus();
  },
  { immediate: true }
);

watch(
  () => myIdDisabledReason.value,
  (reason) => {
    if (reason && checkoutForm.value.paymentMethod === "myid") {
      checkoutForm.value.paymentMethod = "click";
    }
  }
);

watch(
  () => [myIdReturnReasonCode.value, myIdReturnSessionId.value, myIdReturnAuthCode.value],
  async ([reasonCode, sessionId, authCode]) => {
    if (!sessionId || reasonCode === null || authCode) {
      return;
    }

    const key = `${sessionId}:${reasonCode}`;
    if (myIdReturnProcessedKey.value === key) {
      return;
    }

    myIdReturnProcessedKey.value = key;
    pageError.value = "";
    myIdFinalizeLoading.value = true;

    try {
      const response = await apiClient.post("/payments/myid/finalize", {
        session_id: sessionId,
        reason_code: reasonCode,
      });
      pageError.value = String(response.data?.result_note || "").trim() || t("checkoutPage.myidHintCancelled");
      await replaceCheckoutQuery({});
    } catch (error) {
      pageError.value = getApiErrorMessage(error, t("send"));
    } finally {
      myIdFinalizeLoading.value = false;
    }
  },
  { immediate: true }
);

watch(
  () => [myIdReturnSessionId.value, myIdReturnAuthCode.value, myIdReturnReasonCode.value],
  async ([sessionId, authCode, reasonCode]) => {
    if (!sessionId || authCode || reasonCode !== null) {
      return;
    }

    await fetchMyIdSessionResult();
  },
  { immediate: true }
);

watch(
  () => [myIdReturnSessionId.value, myIdReturnAuthCode.value],
  ([, authCode]) => {
    if (authCode) {
      myIdResolvedAuthCode.value = "";
    }
  },
  { immediate: true }
);

onMounted(() => {
  applyStoredCustomerSession();
  fetchClickMeta();
  fetchMyIdMeta();
});

onBeforeUnmount(() => {
  stopStatusPolling();
});
</script>

<template>
  <div class="checkout-page max-w-6xl mx-auto px-4 py-12 mt-[30px]">
    <div class="checkout-head">
      <button type="button" class="checkout-back" @click="router.push('/basket')">
        <LeftArrow :size="28" />
      </button>
      <div>
        <p class="checkout-kicker">{{ t("checkout") }}</p>
        <h1 class="checkout-title">
          <ShoppingCart class="h-6 w-6" />
          {{ t("checkoutPage.title") }}
        </h1>
      </div>
    </div>

    <div
      v-if="showStatusCard"
      :class="['checkout-status-card', `is-${currentStatusVariant}`]"
    >
      <div class="checkout-status-icon">
        <CircleCheckBig v-if="currentStatusVariant === 'success'" class="h-6 w-6" />
        <Clock3 v-else class="h-6 w-6" />
      </div>

      <div class="checkout-status-copy">
        <p class="checkout-status-kicker">
          {{ t("checkoutPage.statusTitle") }} #{{ currentOrderId }}
        </p>
        <h2>{{ currentStatusTitle }}</h2>
        <p>{{ currentStatusHint }}</p>
      </div>

      <button
        type="button"
        class="checkout-refresh-btn"
        :disabled="orderStatusLoading"
        @click="fetchOrderStatus"
      >
        <RefreshCw :class="['h-4 w-4', { 'animate-spin': orderStatusLoading }]" />
        {{ t("checkoutPage.refreshStatus") }}
      </button>
    </div>

    <div v-if="orderStatusError" class="checkout-alert is-error">
      {{ orderStatusError }}
    </div>

    <div v-if="pageError" class="checkout-alert is-error">
      {{ pageError }}
    </div>

    <div
      v-if="myIdReturnSessionId && !showMyIdConfirmCard && myIdReturnReasonCode === null"
      class="checkout-alert is-success"
    >
      {{
        myIdSessionResultLoading
          ? t("checkoutPage.myidCheckingResult")
          : t("checkoutPage.myidAwaitingResult")
      }}
    </div>

    <div v-if="showMyIdConfirmCard" class="checkout-return-card">
      <div class="checkout-return-copy">
        <p class="checkout-status-kicker">{{ t("checkoutPage.myidReturnTitle") }}</p>
        <p>{{ t("checkoutPage.myidReturnHelp") }}</p>
      </div>

      <button
        type="button"
        class="checkout-refresh-btn"
        :disabled="myIdFinalizeLoading"
        @click="finalizeMyIdReturn"
      >
        {{ myIdFinalizeLoading ? t("checkoutPage.myidConfirming") : t("checkoutPage.myidConfirm") }}
      </button>
    </div>

    <div v-if="showMyIdResultCard" class="checkout-result-card">
      <div class="checkout-section-head compact">
        <h2>{{ t("checkoutPage.myidResultTitle") }}</h2>
        <p>{{ myIdResultNote || t("checkoutPage.myidResultHelp") }}</p>
      </div>

      <p v-if="myIdJobId" class="checkout-result-job">
        Job ID: {{ myIdJobId }}
      </p>

      <pre class="checkout-result-json">{{ formattedMyIdProfile }}</pre>
    </div>

    <div v-if="canShowCheckoutForm" class="checkout-grid">
      <section class="checkout-card">
        <div class="checkout-section-head">
          <h2>{{ t("basket") }}</h2>
          <p>{{ t("checkout_subtitle") }}</p>
        </div>

        <div class="checkout-products">
          <article
            v-for="item in basketItems"
            :key="item.basket_key || `${item.id}:checkout`"
            class="checkout-product-row"
          >
            <div class="checkout-product-media">
              <img
                :src="normalizeImages(item.images)[0]"
                :alt="item[`name_${locale}`]"
                class="checkout-product-image"
              />
            </div>

            <div class="checkout-product-copy">
              <h3>{{ item[`name_${locale}`] }}</h3>

              <div v-if="item.selected_options?.length" class="checkout-product-options">
                <span
                  v-for="option in item.selected_options"
                  :key="`${item.id}-${option.group_key}-${option.label}`"
                  class="checkout-option-chip"
                >
                  {{ t(option.title_key) }}: {{ formatSelectedOptionLabel(option) }}
                </span>
              </div>
            </div>

            <strong class="checkout-product-price">
              {{ formatPriceValue(getBasketPrice(item, locale)) }}
            </strong>
          </article>
        </div>
      </section>

      <section class="checkout-card">
        <div class="checkout-section-head">
          <h2>{{ t("info") }}</h2>
          <p>{{ t("checkoutPage.formHelp") }}</p>
        </div>

        <label class="checkout-field">
          <span>{{ t("name") }}</span>
          <input
            v-model="checkoutForm.name"
            type="text"
            autocomplete="name"
            class="checkout-input"
            :placeholder="t('checkoutPage.nameHint')"
            :readonly="isCustomerLocked"
          />
        </label>

        <label class="checkout-field">
          <span>{{ t("phone") }}</span>
          <input
            :value="checkoutForm.phone"
            type="tel"
            autocomplete="tel"
            class="checkout-input"
            :placeholder="t('checkoutPage.phoneHint')"
            :readonly="isCustomerLocked"
            @input="!isCustomerLocked && (checkoutForm.phone = formatUzbekistanPhoneInput($event.target.value))"
          />
        </label>

        <div class="checkout-payment-block">
          <div class="checkout-section-head compact">
            <h2>{{ t("checkoutPage.paymentTitle") }}</h2>
            <p>{{ t("checkoutPage.paymentHelp") }}</p>
          </div>

          <button
            type="button"
            :class="[
              'checkout-payment-option',
              {
                active: checkoutForm.paymentMethod === 'click',
                disabled: !clickMeta.enabled,
              },
            ]"
            :disabled="!clickMeta.enabled"
            @click="checkoutForm.paymentMethod = 'click'"
          >
            <div class="checkout-payment-copy">
              <CreditCard class="h-5 w-5" />
              <div>
                <strong>Click</strong>
                <p>
                  {{
                    clickMeta.enabled
                      ? t("checkoutPage.clickDescription")
                      : t("checkoutPage.clickUnavailable")
                  }}
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            :class="[
              'checkout-payment-option',
              {
                active: checkoutForm.paymentMethod === 'myid',
                disabled: Boolean(myIdDisabledReason),
              },
            ]"
            :disabled="Boolean(myIdDisabledReason)"
            @click="checkoutForm.paymentMethod = 'myid'"
          >
            <div class="checkout-payment-copy">
              <CreditCard class="h-5 w-5" />
              <div>
                <strong>{{ t("checkoutPage.installmentOption") }}</strong>
                <p>
                  {{
                    myIdDisabledReason
                      ? myIdDisabledReason
                      : t("checkoutPage.myidDescription")
                  }}
                </p>
              </div>
            </div>
          </button>

          <div v-if="checkoutForm.paymentMethod === 'myid'" class="checkout-myid-fields">
            <div class="checkout-section-head compact">
              <h2>{{ t("checkoutPage.myidTitle") }}</h2>
              <p>{{ t("checkoutPage.myidIdentityHelp") }}</p>
            </div>

            <label class="checkout-field">
              <span>{{ t("orderModal.pinfl") }}</span>
              <input
                :value="checkoutForm.myIdPinfl"
                type="text"
                inputmode="numeric"
                class="checkout-input"
                :placeholder="t('checkoutPage.myidPinflHint')"
                @input="checkoutForm.myIdPinfl = normalizeMyIdPinflInput($event.target.value)"
              />
            </label>

            <label class="checkout-field">
              <span>{{ t("orderModal.passport") }}</span>
              <input
                :value="checkoutForm.myIdPassport"
                type="text"
                autocapitalize="characters"
                class="checkout-input"
                :placeholder="t('checkoutPage.myidPassportHint')"
                @input="checkoutForm.myIdPassport = normalizeMyIdPassportInput($event.target.value)"
              />
            </label>

            <label class="checkout-field">
              <span>{{ t("orderModal.birthDate") }}</span>
              <input
                v-model="checkoutForm.myIdBirthDate"
                type="date"
                class="checkout-input"
              />
            </label>
          </div>
        </div>

        <div class="checkout-summary">
          <div class="checkout-summary-row">
            <span>{{ t("allBasket") }}</span>
            <strong>{{ totalAmountFormatted }}</strong>
          </div>

          <button
            type="button"
            class="checkout-submit-btn"
            :disabled="!canSubmitOrder"
            @click="submitCheckout"
          >
            {{ submitButtonLabel }}
          </button>
        </div>
      </section>
    </div>

    <div v-else class="checkout-empty-state">
      <p class="checkout-empty-title">{{ t("empty") }}</p>
      <p class="checkout-empty-copy">
        {{
          showStatusCard
            ? currentStatusHint
            : t("checkoutPage.emptyAction")
        }}
      </p>
      <button type="button" class="checkout-empty-btn" @click="router.push('/products')">
        {{ t("checkoutPage.continueShopping") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.checkout-page {
  background: transparent;
}

.checkout-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}

.checkout-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: #ffffff;
  color: #18304f;
}

.checkout-kicker {
  margin: 0 0 6px;
  font-size: 0.9rem;
  font-weight: 600;
  color: #5f7593;
}

.checkout-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #142338;
  font-size: 2rem;
  font-weight: 800;
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.9fr);
  gap: 24px;
}

.checkout-card,
.checkout-status-card {
  border-radius: 28px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 50px rgba(20, 35, 56, 0.08);
}

.checkout-card {
  padding: 24px;
}

.checkout-section-head {
  margin-bottom: 18px;
}

.checkout-section-head.compact {
  margin-bottom: 14px;
}

.checkout-section-head h2 {
  margin: 0;
  color: #142338;
  font-size: 1.2rem;
  font-weight: 700;
}

.checkout-section-head p {
  margin: 6px 0 0;
  color: #60728e;
  line-height: 1.5;
}

.checkout-products {
  display: grid;
  gap: 18px;
}

.checkout-product-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  align-items: start;
  padding: 18px;
  border-radius: 24px;
  background: #f7f9fb;
  border: 1px solid rgba(20, 35, 56, 0.06);
}

.checkout-product-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(240, 245, 250, 0.92)),
    #ffffff;
  border: 1px solid rgba(20, 35, 56, 0.06);
}

.checkout-product-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.checkout-product-copy h3 {
  margin: 0;
  color: #18304f;
  font-size: 1.08rem;
  font-weight: 700;
  line-height: 1.4;
}

.checkout-product-copy {
  width: 100%;
}

.checkout-product-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.checkout-option-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 10px;
  background: #ffffff;
  color: #52657f;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid rgba(20, 35, 56, 0.08);
}

.checkout-product-price {
  color: #142338;
  font-size: 1.08rem;
  white-space: nowrap;
  display: block;
  width: 100%;
  text-align: right;
}

.checkout-field {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.checkout-field span {
  color: #19304b;
  font-weight: 600;
}

.checkout-input {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: #fbfcfd;
  color: #142338;
  padding: 14px 16px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.checkout-input:focus {
  border-color: rgba(24, 48, 79, 0.32);
  box-shadow: 0 0 0 4px rgba(24, 48, 79, 0.08);
}

.checkout-payment-block {
  margin-top: 8px;
}

.checkout-myid-fields {
  margin-top: 12px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #f7f9fb;
}

.checkout-payment-option {
  width: 100%;
  margin-bottom: 12px;
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #ffffff;
  padding: 16px;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.checkout-payment-option:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(24, 48, 79, 0.22);
}

.checkout-payment-option.active {
  border-color: #18304f;
  background: rgba(24, 48, 79, 0.04);
}

.checkout-payment-option.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.checkout-payment-copy {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  color: #18304f;
}

.checkout-payment-copy strong {
  display: block;
  margin-bottom: 4px;
}

.checkout-payment-copy p {
  margin: 0;
  color: #637792;
  line-height: 1.5;
}

.checkout-summary {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(20, 35, 56, 0.08);
}

.checkout-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  color: #4f617b;
  font-size: 1rem;
}

.checkout-summary-row strong {
  color: #142338;
  font-size: 1.2rem;
}

.checkout-submit-btn,
.checkout-refresh-btn,
.checkout-empty-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 18px;
  border: 1px solid #18304f;
  background: #18304f;
  color: #ffffff;
  font-weight: 700;
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.checkout-submit-btn {
  width: 100%;
  min-height: 54px;
}

.checkout-refresh-btn {
  padding: 14px 18px;
}

.checkout-empty-btn {
  padding: 14px 22px;
}

.checkout-submit-btn:hover:not(:disabled),
.checkout-refresh-btn:hover:not(:disabled),
.checkout-empty-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #12263d;
  border-color: #12263d;
}

.checkout-submit-btn:disabled,
.checkout-refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkout-status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 24px;
  margin-bottom: 22px;
}

.checkout-return-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 22px;
  margin-bottom: 22px;
  border-radius: 24px;
  border: 1px solid rgba(34, 197, 94, 0.18);
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(255, 255, 255, 0.98));
}

.checkout-return-copy {
  flex: 1;
}

.checkout-return-copy p:last-child {
  margin: 0;
  color: #43607c;
  line-height: 1.55;
}

.checkout-result-card {
  margin-bottom: 22px;
  padding: 22px;
  border-radius: 24px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 50px rgba(20, 35, 56, 0.08);
}

.checkout-result-job {
  margin: 0 0 12px;
  color: #51647e;
  font-size: 0.92rem;
  font-weight: 600;
}

.checkout-result-json {
  margin: 0;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #f7f9fb;
  padding: 16px;
  color: #18304f;
  font-size: 0.85rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.checkout-status-card.is-success {
  border-color: rgba(21, 128, 61, 0.2);
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(255, 255, 255, 0.98));
}

.checkout-status-card.is-error {
  border-color: rgba(185, 28, 28, 0.18);
  background: linear-gradient(135deg, rgba(254, 242, 242, 0.98), rgba(255, 255, 255, 0.98));
}

.checkout-status-card.is-pending {
  border-color: rgba(180, 83, 9, 0.18);
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.98), rgba(255, 255, 255, 0.98));
}

.checkout-status-icon {
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.8);
  color: #18304f;
  flex-shrink: 0;
}

.checkout-status-copy {
  flex: 1;
}

.checkout-status-kicker {
  margin: 0 0 8px;
  color: #637792;
  font-weight: 700;
}

.checkout-status-copy h2 {
  margin: 0 0 6px;
  color: #142338;
  font-size: 1.2rem;
  font-weight: 800;
}

.checkout-status-copy p {
  margin: 0;
  color: #51647e;
  line-height: 1.5;
}

.checkout-alert {
  margin-bottom: 18px;
  border-radius: 18px;
  padding: 14px 16px;
  font-weight: 600;
}

.checkout-alert.is-error {
  background: rgba(254, 242, 242, 0.98);
  color: #991b1b;
  border: 1px solid rgba(239, 68, 68, 0.16);
}

.checkout-alert.is-success {
  background: rgba(236, 253, 245, 0.98);
  color: #166534;
  border: 1px solid rgba(34, 197, 94, 0.16);
}

.checkout-empty-state {
  padding: 42px 24px;
  border-radius: 28px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: rgba(255, 255, 255, 0.98);
  text-align: center;
}

.checkout-empty-title {
  margin: 0 0 10px;
  color: #142338;
  font-size: 1.4rem;
  font-weight: 800;
}

.checkout-empty-copy {
  margin: 0 0 18px;
  color: #60728e;
  line-height: 1.6;
}

@media (max-width: 960px) {
  .checkout-grid {
    grid-template-columns: 1fr;
  }

  .checkout-return-card,
  .checkout-status-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .checkout-refresh-btn {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .checkout-head {
    gap: 12px;
    align-items: flex-start;
  }

  .checkout-title {
    font-size: 1.5rem;
  }

  .checkout-card,
  .checkout-status-card,
  .checkout-empty-state {
    border-radius: 22px;
  }

  .checkout-card {
    padding: 18px;
  }

  .checkout-product-media {
    max-width: 100%;
  }

  .checkout-product-price {
    grid-column: 1 / -1;
  }
}
</style>
