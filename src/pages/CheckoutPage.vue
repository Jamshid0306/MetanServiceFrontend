<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { CalendarDays, CircleCheckBig, CreditCard, ShoppingCart } from "lucide-vue-next";

import LeftArrow from "@/components/icons/LeftArrow.vue";
import { apiClient, getApiErrorMessage, resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import {
  calculateCreditPlan,
  formatCylinderCountLabel,
  formatCylinderOptionLabel,
  formatPriceValue,
  getBasketPrice,
  getCreditPlans,
  hasCreditPricing,
  parseNumericPrice,
} from "@/lib/productOptions";
import {
  formatUzbekistanPhoneInput,
  getStoredCustomerSession,
  normalizeCustomerPhone,
} from "@/lib/customerSession";
import { useBasketStore } from "@/store/basketStore";
import { useCreditTariffsStore } from "@/store/creditTariffsStore";

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const basketStore = useBasketStore();
const creditTariffsStore = useCreditTariffsStore();

const MYID_POPUP_QUERY_KEY = "myid_popup";
const MYID_POPUP_MESSAGE_TYPE = "myid-checkout-result";
const MYID_PAYMENT_URL_STORAGE_PREFIX = "checkout:myid-payment-url:";

basketStore.normalizeBasket();

const customerSession = ref(null);
const checkoutForm = ref({
  name: "",
  phone: "+998",
  paymentMethod: "click",
  myIdPassport: "",
  myIdBirthDate: "",
});

const pageError = ref("");
const clickSubmitLoading = ref(false);
const myIdStartLoading = ref(false);
const creditSubmitLoading = ref(false);
const clickMeta = ref({ enabled: false });
const myIdMeta = ref({ enabled: false });
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
const initialPaymentUrl = ref("");
const tariffStepConfirmed = ref(false);
const birthDatePickerInput = ref(null);
let statusPollTimeoutId = null;

const basketItems = computed(() => basketStore.basket);
const readSingleQueryValue = (value) => (Array.isArray(value) ? value[0] : value);
const selectedPaymentQuery = computed(() =>
  String(readSingleQueryValue(route.query.payment) || "")
    .trim()
    .toLowerCase()
);
const currentOrderId = computed(() => {
  const rawValue = readSingleQueryValue(route.query.order_id);
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
});
const myIdReturnAuthCode = computed(() =>
  String(readSingleQueryValue(route.query.auth_code) || "").trim()
);
const myIdReturnSessionId = computed(() =>
  String(readSingleQueryValue(route.query.session_id) || "").trim()
);
const isMyIdPopupWindow = computed(
  () => String(readSingleQueryValue(route.query[MYID_POPUP_QUERY_KEY]) || "").trim() === "1"
);
const myIdReturnReasonCode = computed(() => {
  const rawValue = readSingleQueryValue(route.query.reason_code ?? route.query.result_code);
  const numeric = Number(rawValue);
  return Number.isFinite(numeric) ? numeric : null;
});
const effectiveMyIdAuthCode = computed(
  () => myIdReturnAuthCode.value || myIdResolvedAuthCode.value
);
const showMyIdConfirmCard = computed(
  () => Boolean(myIdReturnSessionId.value && effectiveMyIdAuthCode.value)
);
const currentOrderStatus = computed(() =>
  String(orderStatus.value?.status || "")
    .trim()
    .toLowerCase()
);
const currentStatusPaymentMethod = computed(() =>
  String(orderStatus.value?.payment_method || checkoutForm.value.paymentMethod || "click")
    .trim()
    .toLowerCase()
);
const currentOrderMyIdCode = computed(() => Number(orderStatus.value?.myid_result_code || 0));
const isInstallmentJourney = computed(
  () =>
    checkoutForm.value.paymentMethod === "myid" ||
    selectedPaymentQuery.value === "myid" ||
    Boolean(myIdReturnSessionId.value) ||
    currentStatusPaymentMethod.value === "myid" ||
    currentOrderMyIdCode.value === 1
);
const flowSwitchLocked = computed(
  () => Boolean(currentOrderId.value) && ["pending", "prepared"].includes(currentOrderStatus.value)
);
const hasActiveStraightPaymentOrder = computed(
  () =>
    Boolean(currentOrderId.value) &&
    currentStatusPaymentMethod.value === "click" &&
    currentOrderMyIdCode.value !== 1 &&
    ["pending", "prepared"].includes(currentOrderStatus.value)
);
const isCustomerLocked = computed(
  () =>
    Boolean(customerSession.value?.name) &&
    normalizeCustomerPhone(customerSession.value?.phone).length === 12
);

const getBasketItemKey = (item) => item?.basket_key || `${item?.id}:base`;
const getBasketItemInitialPaymentAmount = (item) => {
  if (!item?.initial_payment_enabled) {
    return 0;
  }
  return Number(parseNumericPrice(item.initial_payment_amount) || 0);
};

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

const getItemCreditPlans = (item) =>
  getCreditPlans(item, creditTariffsStore.tariffs, {
    amount: getBasketPrice(item, locale.value),
    locale: locale.value,
  });

const getDefaultCreditPlan = (plans = []) =>
  plans.find((plan) => plan.months === 12) || plans[0] || null;

const resolveSelectedCreditPlanForItem = (item, plans = getItemCreditPlans(item)) => {
  const currentMonths = Number(item?.credit_plan?.months || 0);
  if (Number.isFinite(currentMonths) && currentMonths > 0) {
    const matchedPlan = plans.find((plan) => plan.months === currentMonths);
    if (matchedPlan) {
      return matchedPlan;
    }
  }

  return getDefaultCreditPlan(plans);
};

const buildBasketCreditPlan = (item, plan) => {
  if (!plan) {
    return null;
  }

  const payment = calculateCreditPlan(
    getBasketPrice(item, locale.value),
    plan.percent,
    plan.months
  );

  return {
    tariff_id: plan.id || null,
    months: plan.months,
    percent: plan.percent,
    monthly_payment: payment?.monthlyPayment || null,
    total: payment?.total || null,
  };
};

const isSameBasketCreditPlan = (left, right) =>
  Number(left?.months || 0) === Number(right?.months || 0) &&
  Number(left?.tariff_id || left?.id || 0) === Number(right?.tariff_id || right?.id || 0) &&
  Number(left?.monthly_payment || left?.monthlyPayment || 0) ===
    Number(right?.monthly_payment || right?.monthlyPayment || 0) &&
  Number(left?.total || 0) === Number(right?.total || 0);

const installmentSelectionsByKey = computed(() =>
  basketItems.value.reduce((acc, item) => {
    const plans = getItemCreditPlans(item);
    const selectedPlan = resolveSelectedCreditPlanForItem(item, plans);
    const selectedPayment = selectedPlan
      ? calculateCreditPlan(
          getBasketPrice(item, locale.value),
          selectedPlan.percent,
          selectedPlan.months
        )
      : null;

    acc[getBasketItemKey(item)] = {
      plans,
      selectedPlan,
      selectedPayment,
    };
    return acc;
  }, {})
);

const getInstallmentSelectionForItem = (item) =>
  installmentSelectionsByKey.value[getBasketItemKey(item)] || {
    plans: [],
    selectedPlan: null,
    selectedPayment: null,
  };

const setBasketItemCreditPlan = (itemKey, creditPlan) => {
  if (typeof basketStore.updateCreditPlan === "function") {
    basketStore.updateCreditPlan(itemKey, creditPlan);
    return;
  }

  const item = basketStore.basket.find(
    (basketItem) => getBasketItemKey(basketItem) === itemKey
  );
  if (!item) {
    return;
  }

  if (creditPlan) {
    item.credit_plan = { ...creditPlan };
  } else {
    delete item.credit_plan;
  }
};

const selectInstallmentPlanForItem = (item, plan) => {
  const nextCreditPlan = buildBasketCreditPlan(item, plan);
  setBasketItemCreditPlan(getBasketItemKey(item), nextCreditPlan);
};

const productsPayload = computed(() =>
  basketItems.value.map((item) => ({
    id: item.id,
    name:
      item?.[`name_${locale.value}`] || item?.name_uz || item?.name_ru || item?.name_en || "",
    quantity: Number(item?.quantity || 1),
    price: Number(parseNumericPrice(getBasketPrice(item, locale.value)) || 0),
    selected_options: Array.isArray(item?.selected_options) ? item.selected_options : [],
    credit_plan: item?.credit_plan || null,
    initial_payment_enabled: Boolean(item?.initial_payment_enabled),
    initial_payment_amount: getBasketItemInitialPaymentAmount(item),
  }))
);

const basketHasInvalidPrice = computed(() =>
  basketItems.value.some((item) => parseNumericPrice(getBasketPrice(item, locale.value)) === null)
);
const totalAmount = computed(() =>
  basketItems.value.reduce((sum, item) => {
    const numeric = parseNumericPrice(getBasketPrice(item, locale.value));
    const quantity = Number(item?.quantity || 1);
    return numeric === null ? sum : sum + numeric * quantity;
  }, 0)
);
const totalInitialPayment = computed(() =>
  basketItems.value.reduce(
    (sum, item) => sum + getBasketItemInitialPaymentAmount(item) * Number(item?.quantity || 1),
    0
  )
);
const basketItemCount = computed(() =>
  basketItems.value.reduce((sum, item) => sum + Number(item?.quantity || 1), 0)
);
const totalMonthlyInstallment = computed(() =>
  basketItems.value.reduce((sum, item) => {
    const selection = getInstallmentSelectionForItem(item);
    return sum + Number(selection.selectedPayment?.monthlyPayment || 0) * Number(item?.quantity || 1);
  }, 0)
);
const totalAmountFormatted = computed(() => formatPriceValue(totalAmount.value));
const totalInitialPaymentFormatted = computed(() => formatPriceValue(totalInitialPayment.value));
const totalMonthlyInstallmentFormatted = computed(() =>
  formatPriceValue(totalMonthlyInstallment.value)
);
const canShowCheckoutForm = computed(() => basketItems.value.length > 0);
const basketSupportsInstallment = computed(() =>
  basketItems.value.every((item) =>
    hasCreditPricing(item, creditTariffsStore.tariffs, {
      amount: getBasketPrice(item, locale.value),
      locale: locale.value,
    })
  )
);
const allInstallmentPlansSelected = computed(
  () =>
    basketSupportsInstallment.value &&
    basketItems.value.every((item) => {
      const selection = getInstallmentSelectionForItem(item);
      return selection.plans.length > 0 && Boolean(selection.selectedPlan);
    })
);
const showStatusCard = computed(() => Boolean(currentOrderId.value && orderStatus.value));
const hasVerifiedMyId = computed(() => Boolean(myIdProfileResult.value) || currentOrderMyIdCode.value === 1);
const installmentCompleted = computed(
  () => hasVerifiedMyId.value && currentOrderStatus.value === "completed"
);
const needsInitialPayment = computed(() => totalInitialPayment.value > 0);
const tariffStepCompleted = computed(
  () =>
    showMyIdConfirmCard.value ||
    (allInstallmentPlansSelected.value &&
    (tariffStepConfirmed.value || hasVerifiedMyId.value || Boolean(currentOrderId.value))
    )
);
const installmentReadyToSubmitCredit = computed(
  () =>
    !needsInitialPayment.value &&
    hasVerifiedMyId.value &&
    !installmentCompleted.value &&
    Boolean(currentOrderId.value)
);
const installmentWaitingInitialPayment = computed(
  () =>
    needsInitialPayment.value &&
    hasVerifiedMyId.value &&
    !installmentCompleted.value &&
    currentStatusPaymentMethod.value === "click" &&
    ["pending", "prepared"].includes(currentOrderStatus.value)
);
const canProceedToInitialPayment = computed(
  () =>
    Boolean(initialPaymentUrl.value) &&
    needsInitialPayment.value &&
    hasVerifiedMyId.value &&
    !installmentCompleted.value
);
const myIdDisabledReason = computed(() => {
  if (!myIdMeta.value.enabled) {
    return t("checkoutPage.myidUnavailable");
  }

  if (totalInitialPayment.value > 0 && !clickMeta.value.enabled) {
    return t("checkoutPage.clickUnavailable");
  }

  if (!basketSupportsInstallment.value) {
    return t("checkoutPage.installmentUnavailable");
  }

  return "";
});
const verificationActionLabel = computed(() => {
  if (myIdStartLoading.value) {
    return t("checkoutPage.verificationWaiting");
  }
  if (hasVerifiedMyId.value) {
    return t("checkoutPage.verificationDone");
  }
  return t("checkoutPage.verificationAction");
});
const purchaseActionLabel = computed(() =>
  creditSubmitLoading.value ? t("checkoutPage.purchaseWaiting") : t("buy")
);

const verifiedProfileSummary = computed(() => {
  const profileRoot = myIdProfileResult.value?.profile;
  if (!profileRoot || typeof profileRoot !== "object") {
    return null;
  }

  const commonData = profileRoot.common_data || {};
  const address = profileRoot.address || {};
  const permanent = address.permanent_registration || {};
  const fullName = [
    commonData.last_name,
    commonData.first_name,
    commonData.middle_name,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  const location = [permanent.region, permanent.district]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

  return {
    fullName,
    location,
  };
});

const activeInstallmentStepKey = computed(() => {
  if (!isInstallmentJourney.value) {
    return "";
  }

  if (showMyIdConfirmCard.value) {
    return "myid";
  }

  if (!tariffStepCompleted.value) {
    return "tariff";
  }

  if (!hasVerifiedMyId.value) {
    return "myid";
  }

  if (needsInitialPayment.value && !installmentCompleted.value) {
    return "initial-payment";
  }

  if (!needsInitialPayment.value && !installmentCompleted.value) {
    return "purchase";
  }

  return "complete";
});

const installmentStepItems = computed(() => {
  const steps = [
    {
      key: "tariff",
      label: t("checkoutPage.stepTariff"),
      done: tariffStepCompleted.value,
    },
    {
      key: "myid",
      label: t("checkoutPage.stepVerification"),
      done: hasVerifiedMyId.value,
    },
    needsInitialPayment.value
      ? {
          key: "initial-payment",
          label: t("checkoutPage.stepInitialPayment"),
          done: installmentCompleted.value,
        }
      : {
          key: "purchase",
          label: t("checkoutPage.stepPurchase"),
          done: installmentCompleted.value,
        },
    {
      key: "complete",
      label: t("checkoutPage.stepComplete"),
      done: installmentCompleted.value,
    },
  ];

  const firstPendingIndex = steps.findIndex((step) => !step.done);
  return steps.map((step, index) => ({
    ...step,
    number: index + 1,
    state:
      step.done
        ? "done"
        : step.key === activeInstallmentStepKey.value || index === firstPendingIndex
          ? "active"
          : "todo",
  }));
});

const currentStatusVariant = computed(() => {
  if (installmentCompleted.value) return "success";
  if (currentOrderStatus.value === "cancelled") return "error";
  return "pending";
});

const currentStatusTitle = computed(() => {
  if (currentOrderMyIdCode.value === 1 && currentOrderStatus.value === "completed") {
    return t("checkoutPage.myidStatusCompleted");
  }

  if (
    currentOrderMyIdCode.value === 1 &&
    currentStatusPaymentMethod.value === "myid" &&
    currentOrderStatus.value === "pending"
  ) {
    return t("checkoutPage.myidStatusVerified");
  }

  if (
    currentOrderMyIdCode.value === 1 &&
    currentStatusPaymentMethod.value === "click" &&
    ["pending", "prepared"].includes(currentOrderStatus.value)
  ) {
    return t("checkoutPage.initialPaymentPendingTitle");
  }

  if (currentStatusPaymentMethod.value === "myid") {
    if (currentOrderStatus.value === "completed") return t("checkoutPage.myidStatusCompleted");
    if (currentOrderStatus.value === "cancelled") return t("checkoutPage.myidStatusCancelled");
    if (currentOrderStatus.value === "pending") return t("checkoutPage.myidStatusPending");
    return t("checkoutPage.myidStatusUnknown");
  }

  if (currentOrderStatus.value === "prepared") return t("checkoutPage.statusPrepared");
  if (currentOrderStatus.value === "completed") return t("checkoutPage.statusCompleted");
  if (currentOrderStatus.value === "cancelled") return t("checkoutPage.statusCancelled");
  if (currentOrderStatus.value === "pending") return t("checkoutPage.statusPending");
  return t("checkoutPage.statusUnknown");
});

const currentStatusHint = computed(() => {
  const statusNote = String(
    orderStatus.value?.status_note ||
      orderStatus.value?.click_error_note ||
      orderStatus.value?.myid_result_note ||
      ""
  ).trim();

  if (currentOrderMyIdCode.value === 1 && currentOrderStatus.value === "completed") {
    return statusNote || t("checkoutPage.myidHintCompleted");
  }

  if (
    currentOrderMyIdCode.value === 1 &&
    currentStatusPaymentMethod.value === "myid" &&
    currentOrderStatus.value === "pending"
  ) {
    return statusNote || t("checkoutPage.installmentReadyHint");
  }

  if (
    currentOrderMyIdCode.value === 1 &&
    currentStatusPaymentMethod.value === "click" &&
    ["pending", "prepared"].includes(currentOrderStatus.value)
  ) {
    return statusNote || t("checkoutPage.initialPaymentPendingHint");
  }

  if (currentStatusPaymentMethod.value === "myid") {
    if (currentOrderStatus.value === "completed") {
      return statusNote || t("checkoutPage.myidHintCompleted");
    }
    if (currentOrderStatus.value === "cancelled") {
      return statusNote || t("checkoutPage.myidHintCancelled");
    }
    return statusNote || t("checkoutPage.myidHintPending");
  }

  if (currentOrderStatus.value === "prepared") {
    return statusNote || t("checkoutPage.statusHintPrepared");
  }
  if (currentOrderStatus.value === "completed") {
    return statusNote || t("checkoutPage.statusHintCompleted");
  }
  if (currentOrderStatus.value === "cancelled") {
    return statusNote || t("checkoutPage.statusHintCancelled");
  }
  return statusNote || t("checkoutPage.statusHintPending");
});

const isVerificationButtonDisabled = computed(
  () =>
    Boolean(myIdDisabledReason.value) ||
    myIdStartLoading.value ||
    myIdFinalizeLoading.value ||
    basketHasInvalidPrice.value ||
    totalAmount.value <= 0
);
const isStraightPaymentButtonDisabled = computed(
  () =>
    clickSubmitLoading.value ||
    basketHasInvalidPrice.value ||
    totalAmount.value <= 0 ||
    hasActiveStraightPaymentOrder.value
);

const stopStatusPolling = () => {
  if (statusPollTimeoutId) {
    clearTimeout(statusPollTimeoutId);
    statusPollTimeoutId = null;
  }
};

const scheduleStatusPolling = () => {
  stopStatusPolling();
  if (!currentOrderId.value || !["pending", "prepared"].includes(currentOrderStatus.value)) {
    return;
  }

  statusPollTimeoutId = window.setTimeout(() => {
    fetchOrderStatus();
  }, 4000);
};

const getInitialPaymentStorageKey = (orderId) =>
  Number.isFinite(Number(orderId)) && Number(orderId) > 0
    ? `${MYID_PAYMENT_URL_STORAGE_PREFIX}${Number(orderId)}`
    : "";

const storeInitialPaymentUrl = (orderId, paymentUrl) => {
  if (typeof window === "undefined") return;
  const storageKey = getInitialPaymentStorageKey(orderId);
  if (!storageKey || !paymentUrl) return;
  window.sessionStorage.setItem(storageKey, paymentUrl);
};

const readInitialPaymentUrl = (orderId) => {
  if (typeof window === "undefined") return "";
  const storageKey = getInitialPaymentStorageKey(orderId);
  if (!storageKey) return "";
  return String(window.sessionStorage.getItem(storageKey) || "").trim();
};

const clearInitialPaymentUrl = (orderId) => {
  if (typeof window === "undefined") return;
  const storageKey = getInitialPaymentStorageKey(orderId);
  if (!storageKey) return;
  window.sessionStorage.removeItem(storageKey);
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

const applyPaymentMethodFromQuery = () => {
  if (myIdReturnSessionId.value) {
    checkoutForm.value.paymentMethod = "myid";
    tariffStepConfirmed.value = true;
    return;
  }

  if (selectedPaymentQuery.value === "myid" || selectedPaymentQuery.value === "click") {
    checkoutForm.value.paymentMethod = selectedPaymentQuery.value;
  }
};

const refreshBasketProductPaymentFlags = async () => {
  const productIds = [
    ...new Set(
      basketItems.value
        .map((item) => Number(item?.id || 0))
        .filter((id) => Number.isFinite(id) && id > 0)
    ),
  ];

  if (!productIds.length) {
    return;
  }

  const responses = await Promise.allSettled(
    productIds.map((id) => apiClient.get(`/products/product/detail/${id}`))
  );
  const latestProductsById = new Map();

  responses.forEach((response) => {
    if (response.status !== "fulfilled" || !response.value?.data?.id) {
      return;
    }
    latestProductsById.set(Number(response.value.data.id), response.value.data);
  });

  basketItems.value.forEach((item) => {
    const latestProduct = latestProductsById.get(Number(item?.id || 0));
    if (!latestProduct) {
      return;
    }

    const itemKey = getBasketItemKey(item);
    const initialPaymentEnabled = Boolean(
      latestProduct.credit_enabled && latestProduct.initial_payment_enabled
    );
    basketStore.replaceBasketItem(itemKey, {
      ...item,
      credit_enabled: Boolean(latestProduct.credit_enabled),
      credit_months: latestProduct.credit_months,
      credit_percent: latestProduct.credit_percent,
      credit_6m_percent: latestProduct.credit_6m_percent,
      credit_plans: latestProduct.credit_plans,
      initial_payment_enabled: initialPaymentEnabled,
      initial_payment_amount: initialPaymentEnabled
        ? latestProduct.initial_payment_amount
        : null,
    });
  });
};

const fetchClickMeta = async () => {
  try {
    const response = await apiClient.get("/payments/click/meta");
    clickMeta.value = {
      enabled: Boolean(response.data?.enabled),
    };
  } catch {
    clickMeta.value = { enabled: false };
  }
};

const fetchMyIdMeta = async () => {
  try {
    const response = await apiClient.get("/payments/myid/meta");
    myIdMeta.value = {
      enabled: Boolean(response.data?.enabled),
    };
  } catch {
    myIdMeta.value = { enabled: false };
  }
};

const syncOrderStatusFromResponse = (payload = {}) => {
  const resolvedOrderId = Number(payload?.order_id || currentOrderId.value || 0) || null;
  if (!resolvedOrderId) {
    return;
  }

  orderStatus.value = {
    ...(orderStatus.value || {}),
    id: resolvedOrderId,
    status: String(payload?.status || orderStatus.value?.status || "pending").trim(),
    payment_method: String(
      payload?.payment_method || orderStatus.value?.payment_method || checkoutForm.value.paymentMethod
    )
      .trim()
      .toLowerCase(),
    myid_result_code:
      payload?.result_code !== undefined
        ? Number(payload.result_code || 0)
        : Number(orderStatus.value?.myid_result_code || 0),
    myid_result_note: String(
      payload?.result_note || orderStatus.value?.myid_result_note || ""
    ).trim(),
    status_note: String(payload?.result_note || orderStatus.value?.status_note || "").trim(),
    click_error_note: String(payload?.result_note || orderStatus.value?.click_error_note || "").trim(),
  };
};

const fetchOrderStatus = async () => {
  if (!currentOrderId.value) {
    orderStatus.value = null;
    initialPaymentUrl.value = "";
    return;
  }

  orderStatusLoading.value = true;
  orderStatusError.value = "";

  try {
    const response = await apiClient.get(`/payments/orders/${currentOrderId.value}`);
    orderStatus.value = response.data || null;

    if (currentOrderMyIdCode.value === 1) {
      checkoutForm.value.paymentMethod = "myid";
    }

    if (["completed", "cancelled"].includes(currentOrderStatus.value)) {
      clearInitialPaymentUrl(currentOrderId.value);
      initialPaymentUrl.value = "";
    } else if (!initialPaymentUrl.value) {
      initialPaymentUrl.value = readInitialPaymentUrl(currentOrderId.value);
    }

    if (currentOrderStatus.value === "completed") {
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

const normalizeMyIdPassportInput = (value) =>
  String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);

const normalizeMyIdBirthDateInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  return [day, month, year].filter(Boolean).join(".");
};

const toMyIdBirthDatePayload = (value) => {
  const rawValue = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const match = rawValue.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) {
    return "";
  }

  const [, day, month, year] = match;
  const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
  const isValidDate =
    parsedDate.getFullYear() === Number(year) &&
    parsedDate.getMonth() === Number(month) - 1 &&
    parsedDate.getDate() === Number(day);

  return isValidDate ? `${year}-${month}-${day}` : "";
};

const toMyIdBirthDateDisplay = (value) => {
  const rawValue = String(value || "").trim();
  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return normalizeMyIdBirthDateInput(rawValue);
  }

  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
};

const openBirthDatePicker = () => {
  const input = birthDatePickerInput.value;
  if (!input) {
    return;
  }

  if (typeof input.showPicker === "function") {
    input.showPicker();
    return;
  }

  input.click();
  input.focus();
};

const handleBirthDatePickerChange = (event) => {
  checkoutForm.value.myIdBirthDate = toMyIdBirthDateDisplay(event.target.value);
};

const replaceCheckoutQuery = async (nextQuery = {}) => {
  await router.replace({
    path: route.path,
    query: nextQuery,
  });
};

const buildMyIdRedirectUri = () => `${window.location.origin}/checkout?payment=myid`;

const getPersistentCheckoutQuery = ({
  orderId = currentOrderId.value,
  paymentMethod = selectedPaymentQuery.value || checkoutForm.value.paymentMethod,
} = {}) => {
  const nextQuery = {};
  const resolvedOrderId = Number(orderId);
  if (Number.isFinite(resolvedOrderId) && resolvedOrderId > 0) {
    nextQuery.order_id = String(resolvedOrderId);
  }

  const normalizedPayment = String(paymentMethod || "").trim().toLowerCase();
  if (normalizedPayment) {
    nextQuery.payment = normalizedPayment;
  }

  return nextQuery;
};

const resetTransientMyIdState = () => {
  myIdResolvedAuthCode.value = "";
  myIdProfileResult.value = null;
  myIdResultNote.value = "";
  myIdJobId.value = "";
};

const buildCheckoutPayload = () => {
  if (!canShowCheckoutForm.value) {
    pageError.value = t("checkoutPage.emptyAction");
    return null;
  }

  if (basketHasInvalidPrice.value || totalAmount.value <= 0) {
    pageError.value = t("checkoutPage.invalidPrice");
    return null;
  }

  const name = String(checkoutForm.value.name || "").trim();
  const phone = normalizeCustomerPhone(checkoutForm.value.phone);

  if (!name || phone.length !== 12) {
    pageError.value = t("please_fill_all_fields");
    return null;
  }

  return {
    name,
    phone,
    locale: locale.value,
    total: totalAmount.value,
    products: productsPayload.value,
  };
};

const finalizeMyIdPayload = async ({
  sessionId,
  authCode = "",
  reasonCode = null,
  orderId = currentOrderId.value,
} = {}) => {
  if (!sessionId || (!authCode && reasonCode === null)) {
    return null;
  }

  pageError.value = "";
  myIdFinalizeLoading.value = true;

  try {
    const payload = {
      session_id: sessionId,
      order_id: orderId,
    };

    if (authCode) {
      payload.auth_code = authCode;
    } else {
      payload.reason_code = reasonCode;
    }

    const response = await apiClient.post("/payments/myid/finalize", payload);
    const responseData = response.data || {};
    const nextOrderId = Number(responseData?.order_id || orderId || 0) || null;

    if (authCode) {
      myIdProfileResult.value = responseData?.profile || null;
      myIdResultNote.value = String(responseData?.result_note || "").trim();
      myIdJobId.value = String(responseData?.job_id || "").trim();
    } else {
      pageError.value =
        String(responseData?.result_note || "").trim() || t("checkoutPage.myidHintCancelled");
    }

    const paymentUrl = String(responseData?.payment_url || "").trim();
    if (paymentUrl && nextOrderId) {
      storeInitialPaymentUrl(nextOrderId, paymentUrl);
      initialPaymentUrl.value = paymentUrl;
    }

    if (nextOrderId) {
      await replaceCheckoutQuery(
        getPersistentCheckoutQuery({
          orderId: nextOrderId,
          paymentMethod: "myid",
        })
      );
    }

    syncOrderStatusFromResponse(responseData);
    return responseData;
  } catch (error) {
    pageError.value = getApiErrorMessage(error, t("send"));
    return null;
  } finally {
    myIdFinalizeLoading.value = false;
  }
};

const finalizeMyIdReturn = async () => {
  const sessionId = myIdReturnSessionId.value;
  const authCode = effectiveMyIdAuthCode.value;

  if (!sessionId || !authCode) {
    return;
  }

  await finalizeMyIdPayload({
    sessionId,
    authCode,
    orderId: currentOrderId.value,
  });
};

const relayMyIdPopupResult = () => {
  if (!isMyIdPopupWindow.value || typeof window === "undefined" || !window.opener) {
    return false;
  }

  const sessionId = myIdReturnSessionId.value;
  const authCode = myIdReturnAuthCode.value;
  const reasonCode = myIdReturnReasonCode.value;
  const orderId = currentOrderId.value;

  if (!sessionId || (!authCode && reasonCode === null)) {
    return false;
  }

  window.opener.postMessage(
    {
      type: MYID_POPUP_MESSAGE_TYPE,
      session_id: sessionId,
      auth_code: authCode || null,
      reason_code: reasonCode,
      order_id: orderId,
    },
    window.location.origin
  );
  window.opener.focus?.();
  window.close();
  return true;
};

const handleMyIdPopupMessage = async (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  const payload = event.data;
  if (!payload || payload.type !== MYID_POPUP_MESSAGE_TYPE) {
    return;
  }

  const sessionId = String(payload.session_id || "").trim();
  const authCode = String(payload.auth_code || "").trim();
  const reasonCode =
    payload.reason_code === null || payload.reason_code === undefined
      ? null
      : Number(payload.reason_code);
  const orderId = Number(payload.order_id || 0) || null;

  if (orderId) {
    await replaceCheckoutQuery(
      getPersistentCheckoutQuery({
        orderId,
        paymentMethod: "myid",
      })
    );
  }

  if (authCode) {
    await finalizeMyIdPayload({
      sessionId,
      authCode,
      orderId,
    });
    return;
  }

  if (reasonCode !== null) {
    await finalizeMyIdPayload({
      sessionId,
      reasonCode,
      orderId,
    });
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

const startInstallmentVerification = async () => {
  pageError.value = "";
  resetTransientMyIdState();

  if (myIdDisabledReason.value) {
    pageError.value = myIdDisabledReason.value;
    return;
  }

  if (!allInstallmentPlansSelected.value) {
    pageError.value = t("checkoutPage.installmentUnavailable");
    return;
  }

  const payload = buildCheckoutPayload();
  if (!payload) {
    return;
  }

  const passData = normalizeMyIdPassportInput(checkoutForm.value.myIdPassport);
  const birthDate = toMyIdBirthDatePayload(checkoutForm.value.myIdBirthDate);

  if (!passData || !birthDate) {
    pageError.value = t("checkoutPage.myidMissingIdentity");
    return;
  }

  myIdStartLoading.value = true;

  try {
    const response = await apiClient.post(
      "/payments/myid/initiate",
      {
        ...payload,
        pinfl: null,
        pass_data: passData || null,
        birth_date: birthDate,
        lang: locale.value,
        redirect_uri: buildMyIdRedirectUri(),
      },
      {
        timeout: 45000,
      }
    );

    const redirectUrl = String(response.data?.redirect_url || "").trim();
    const orderId = Number(response.data?.order_id || 0) || null;

    if (!redirectUrl) {
      throw new Error("MyID redirect URL was not returned");
    }

    if (orderId) {
      await replaceCheckoutQuery(
        getPersistentCheckoutQuery({
          orderId,
          paymentMethod: "myid",
        })
      );
    }

    window.location.href = redirectUrl;
  } catch (error) {
    pageError.value = getApiErrorMessage(error, t("send"));
  } finally {
    myIdStartLoading.value = false;
  }
};

const submitStraightPayment = async () => {
  pageError.value = "";

  if (hasActiveStraightPaymentOrder.value) {
    await fetchOrderStatus();
    return;
  }

  const payload = buildCheckoutPayload();
  if (!payload) {
    return;
  }

  if (!clickMeta.value.enabled) {
    pageError.value = t("checkoutPage.clickUnavailable");
    return;
  }

  clickSubmitLoading.value = true;

  try {
    const response = await apiClient.post("/payments/click/initiate", {
      ...payload,
      return_url: `${window.location.origin}/checkout`,
    });

    const paymentUrl = String(response.data?.payment_url || "").trim();
    const orderId = Number(response.data?.order_id || 0) || null;

    if (!paymentUrl) {
      throw new Error("Payment URL was not returned");
    }

    if (orderId) {
      await replaceCheckoutQuery(
        getPersistentCheckoutQuery({
          orderId,
          paymentMethod: "click",
        })
      );
    }

    window.location.href = paymentUrl;
  } catch (error) {
    pageError.value = getApiErrorMessage(error, t("send"));
  } finally {
    clickSubmitLoading.value = false;
  }
};

const continueInitialPayment = () => {
  if (!initialPaymentUrl.value) {
    pageError.value = t("checkoutPage.initialPaymentWaiting");
    return;
  }

  window.location.href = initialPaymentUrl.value;
};

const confirmTariffStep = () => {
  pageError.value = "";

  if (!allInstallmentPlansSelected.value) {
    pageError.value = t("checkoutPage.installmentUnavailable");
    return;
  }

  tariffStepConfirmed.value = true;
};

const submitInstallmentCredit = async () => {
  if (!installmentReadyToSubmitCredit.value || !currentOrderId.value) {
    return;
  }

  pageError.value = "";
  creditSubmitLoading.value = true;

  try {
    const response = await apiClient.post(`/payments/orders/${currentOrderId.value}/submit-credit`);
    const responseData = response.data || {};

    myIdResultNote.value = String(responseData?.result_note || "").trim();
    syncOrderStatusFromResponse(responseData);
    await fetchOrderStatus();
  } catch (error) {
    pageError.value = getApiErrorMessage(error, t("send"));
  } finally {
    creditSubmitLoading.value = false;
  }
};

watch(
  () => currentOrderId.value,
  () => {
    if (isMyIdPopupWindow.value) {
      return;
    }

    initialPaymentUrl.value = readInitialPaymentUrl(currentOrderId.value);

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
  () => selectedPaymentQuery.value,
  () => {
    if (flowSwitchLocked.value || currentOrderMyIdCode.value === 1) {
      return;
    }
    applyPaymentMethodFromQuery();
  },
  { immediate: true }
);

watch(
  () => checkoutForm.value.paymentMethod,
  (paymentMethod) => {
    if (paymentMethod !== "myid" && !currentOrderId.value) {
      tariffStepConfirmed.value = false;
    }
  }
);

watch(
  () => myIdDisabledReason.value,
  (reason) => {
    if (
      reason &&
      checkoutForm.value.paymentMethod === "myid" &&
      !currentOrderId.value &&
      currentOrderMyIdCode.value !== 1
    ) {
      checkoutForm.value.paymentMethod = "click";
    }
  }
);

watch(
  () => [myIdReturnReasonCode.value, myIdReturnSessionId.value, myIdReturnAuthCode.value],
  async ([reasonCode, sessionId, authCode]) => {
    if (isMyIdPopupWindow.value) {
      return;
    }
    if (!sessionId || reasonCode === null || authCode) {
      return;
    }

    const key = `${sessionId}:${reasonCode}`;
    if (myIdReturnProcessedKey.value === key) {
      return;
    }

    myIdReturnProcessedKey.value = key;
    pageError.value = "";
    await finalizeMyIdPayload({
      sessionId,
      reasonCode,
      orderId: currentOrderId.value,
    });
  },
  { immediate: true }
);

watch(
  () => [myIdReturnSessionId.value, myIdReturnAuthCode.value, myIdReturnReasonCode.value],
  async ([sessionId, authCode, reasonCode]) => {
    if (isMyIdPopupWindow.value) {
      return;
    }
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

watch(
  installmentSelectionsByKey,
  (selectionMap) => {
    basketItems.value.forEach((item) => {
      const itemKey = getBasketItemKey(item);
      const selection = selectionMap[itemKey];

      if (!selection?.plans?.length) {
        if (item?.credit_plan) {
          setBasketItemCreditPlan(itemKey, null);
        }
        return;
      }

      const nextCreditPlan = buildBasketCreditPlan(item, selection.selectedPlan);
      if (!isSameBasketCreditPlan(item?.credit_plan, nextCreditPlan)) {
        setBasketItemCreditPlan(itemKey, nextCreditPlan);
      }
    });
  },
  { immediate: true, deep: true }
);

onMounted(async () => {
  window.addEventListener("message", handleMyIdPopupMessage);

  if (relayMyIdPopupResult()) {
    return;
  }

  applyStoredCustomerSession();
  applyPaymentMethodFromQuery();
  await refreshBasketProductPaymentFlags();

  await Promise.all([
    fetchClickMeta(),
    fetchMyIdMeta(),
    basketItems.value.length ? creditTariffsStore.fetchTariffs() : Promise.resolve(),
  ]);

  initialPaymentUrl.value = readInitialPaymentUrl(currentOrderId.value);
});

onBeforeUnmount(() => {
  stopStatusPolling();
  window.removeEventListener("message", handleMyIdPopupMessage);
});
</script>

<template>
  <div class="checkout-page max-w-6xl mx-auto px-4 py-12 mt-[30px]">
    <div class="checkout-head">
      <button type="button" class="checkout-back" @click="router.push('/basket')">
        <LeftArrow :size="24" />
      </button>

      <div>
        <p class="checkout-kicker">{{ t("checkout") }}</p>
        <h1 class="checkout-title">
          <ShoppingCart class="h-5 w-5" />
          {{ t("checkoutPage.title") }}
        </h1>
      </div>
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

    <div v-if="canShowCheckoutForm" class="checkout-shell">
      <main class="checkout-main">
        <section class="checkout-band">
          <div class="checkout-flow-switch">
            <button
              type="button"
              :class="[
                'checkout-flow-btn',
                { active: !isInstallmentJourney, disabled: flowSwitchLocked },
              ]"
              :disabled="flowSwitchLocked"
              @click="checkoutForm.paymentMethod = 'click'"
            >
              <span class="checkout-flow-title">{{ t("checkoutPage.oneTimeOption") }}</span>
              <span class="checkout-flow-copy">{{ t("checkoutPage.oneTimeDescription") }}</span>
            </button>

            <button
              type="button"
              :class="[
                'checkout-flow-btn',
                {
                  active: isInstallmentJourney,
                  disabled: Boolean(myIdDisabledReason) || flowSwitchLocked,
                },
              ]"
              :disabled="Boolean(myIdDisabledReason) || flowSwitchLocked"
              @click="checkoutForm.paymentMethod = 'myid'"
            >
              <span class="checkout-flow-title">{{ t("checkoutPage.installmentOption") }}</span>
              <span class="checkout-flow-copy">
                {{ myIdDisabledReason || t("checkoutPage.myidDescription") }}
              </span>
            </button>
          </div>
        </section>

        <section
          v-if="isInstallmentJourney && installmentStepItems.length"
          class="checkout-band"
        >
          <div class="checkout-stepper">
            <div
              v-for="step in installmentStepItems"
              :key="step.key"
              :class="['checkout-step', `is-${step.state}`]"
            >
              <span class="checkout-step-number">
                <CircleCheckBig v-if="step.state === 'done'" class="h-4 w-4" />
                <template v-else>{{ step.number }}</template>
              </span>
              <span class="checkout-step-label">{{ step.label }}</span>
            </div>
          </div>
        </section>

        <section
          v-if="!isInstallmentJourney || activeInstallmentStepKey === 'tariff'"
          class="checkout-band"
        >
          <div class="checkout-section-head">
            <h2>{{ t("basket") }}</h2>
            <p>
              {{
                isInstallmentJourney
                  ? t("checkoutPage.tariffHelp")
                  : t("checkout_subtitle")
              }}
            </p>
          </div>

          <div class="checkout-products">
            <article
              v-for="item in basketItems"
              :key="item.basket_key || `${item.id}:checkout`"
              class="checkout-product-row"
            >
              <div class="checkout-product-media">
                <img
                  :src="normalizeImages(item.images)[0] || ''"
                  :alt="item[`name_${locale}`]"
                  class="checkout-product-image"
                />
              </div>

              <div class="checkout-product-copy">
                <div class="checkout-product-head">
                  <h3>{{ item[`name_${locale}`] }}</h3>
                  <strong class="checkout-product-price">
                    {{ formatPriceValue(getBasketPrice(item, locale)) }}
                  </strong>
                </div>

                <div v-if="item.selected_options?.length" class="checkout-product-options">
                  <span
                    v-for="option in item.selected_options"
                    :key="`${item.id}-${option.group_key}-${option.label}`"
                    class="checkout-option-chip"
                  >
                    {{ t(option.title_key) }}: {{ formatSelectedOptionLabel(option) }}
                  </span>
                </div>

                <div v-if="isInstallmentJourney" class="checkout-installment-picker">
                  <div class="checkout-installment-head">
                    <strong>{{ t("checkoutPage.tariffTitle") }}</strong>
                    <span v-if="getInstallmentSelectionForItem(item).selectedPayment">
                      {{ t("credit.monthlyPayment") }}:
                      {{ formatPriceValue(getInstallmentSelectionForItem(item).selectedPayment.monthlyPayment) }}
                    </span>
                  </div>

                  <div class="checkout-installment-grid">
                    <button
                      v-for="plan in getInstallmentSelectionForItem(item).plans"
                      :key="`${getBasketItemKey(item)}-${plan.months}`"
                      type="button"
                      class="checkout-installment-btn"
                      :class="{
                        active:
                          getInstallmentSelectionForItem(item).selectedPlan?.months === plan.months,
                      }"
                      @click="selectInstallmentPlanForItem(item, plan)"
                    >
                      {{ plan.months }} {{ t("credit.months") }}
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <div v-if="isInstallmentJourney" class="checkout-step-actions">
            <button
              type="button"
              class="checkout-primary-btn"
              :disabled="!allInstallmentPlansSelected"
              @click="confirmTariffStep"
            >
              {{ t("checkoutPage.continueToVerification") }}
            </button>
          </div>
        </section>

        <template v-if="isInstallmentJourney">
          <section
            v-if="activeInstallmentStepKey === 'myid'"
            class="checkout-band checkout-step-panel"
          >
            <div class="checkout-section-head">
              <h2>{{ t("checkoutPage.verificationTitle") }}</h2>
              <p>{{ t("checkoutPage.verificationHelp") }}</p>
            </div>

            <div v-if="showMyIdConfirmCard" class="checkout-myid-return-box">
              <div>
                <strong>{{ t("checkoutPage.myidReturnTitle") }}</strong>
                <p>{{ t("checkoutPage.myidReturnHelp") }}</p>
              </div>

              <button
                type="button"
                class="checkout-primary-btn"
                :disabled="myIdFinalizeLoading"
                @click="finalizeMyIdReturn"
              >
                {{ myIdFinalizeLoading ? t("checkoutPage.myidConfirming") : t("checkoutPage.myidConfirm") }}
              </button>
            </div>

            <template v-else>
              <div class="checkout-form-grid">
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
                    @input="
                      !isCustomerLocked &&
                      (checkoutForm.phone = formatUzbekistanPhoneInput($event.target.value))
                    "
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
                    @input="
                      checkoutForm.myIdPassport = normalizeMyIdPassportInput($event.target.value)
                    "
                  />
                </label>

                <label class="checkout-field checkout-field-wide">
                  <span>{{ t("orderModal.birthDate") }}</span>
                  <div class="checkout-date-input-wrap">
                    <div class="checkout-date-row">
                      <input
                        :value="checkoutForm.myIdBirthDate"
                        type="text"
                        inputmode="numeric"
                        autocomplete="bday"
                        class="checkout-input checkout-date-input"
                        :placeholder="t('checkoutPage.birthDateHint')"
                        @input="
                          checkoutForm.myIdBirthDate = normalizeMyIdBirthDateInput($event.target.value)
                        "
                      />
                      <button
                        type="button"
                        class="checkout-date-picker-btn"
                        @click="openBirthDatePicker"
                      >
                        <CalendarDays class="h-4 w-4" />
                        {{ t("checkoutPage.birthDateCalendar") }}
                      </button>
                      <input
                        ref="birthDatePickerInput"
                        type="date"
                        class="checkout-native-date-input"
                        :value="toMyIdBirthDatePayload(checkoutForm.myIdBirthDate)"
                        tabindex="-1"
                        aria-hidden="true"
                        @change="handleBirthDatePickerChange"
                      />
                    </div>
                    <small>{{ t("checkoutPage.birthDateHelp") }}</small>
                  </div>
                </label>
              </div>

              <div
                v-if="hasVerifiedMyId"
                class="checkout-verified-box"
              >
              <div>
                <strong>{{ t("checkoutPage.verificationDone") }}</strong>
                <p>{{ myIdResultNote || t("checkoutPage.verificationReady") }}</p>
                <p v-if="verifiedProfileSummary?.fullName" class="checkout-verified-meta">
                  {{ verifiedProfileSummary.fullName }}
                </p>
                <p v-if="verifiedProfileSummary?.location" class="checkout-verified-meta">
                  {{ verifiedProfileSummary.location }}
                </p>
                <p v-if="myIdJobId" class="checkout-verified-meta">Job ID: {{ myIdJobId }}</p>
              </div>
              </div>

              <div class="checkout-actions">
                <button
                  type="button"
                  class="checkout-primary-btn"
                  :disabled="isVerificationButtonDisabled"
                  @click="startInstallmentVerification"
                >
                  {{ verificationActionLabel }}
                </button>
              </div>
            </template>
          </section>

          <section
            v-if="activeInstallmentStepKey === 'initial-payment' && needsInitialPayment"
            class="checkout-band checkout-step-panel checkout-payment-focus"
          >
            <div class="checkout-section-head">
              <h2>{{ t("checkoutPage.initialPaymentTitle") }}</h2>
              <p>{{ t("checkoutPage.initialPaymentStepHelp") }}</p>
            </div>

            <div class="checkout-next-step">
              <div>
                <strong>{{ t("checkoutPage.initialPayment") }}</strong>
                <p>{{ totalInitialPaymentFormatted }}</p>
                <span>{{ currentStatusHint }}</span>
              </div>

              <button
                type="button"
                class="checkout-primary-btn"
                :disabled="!canProceedToInitialPayment"
                @click="continueInitialPayment"
              >
                {{ t("checkoutPage.initialPaymentAction") }}
              </button>
            </div>
          </section>

          <section
            v-if="activeInstallmentStepKey === 'purchase' && !needsInitialPayment"
            class="checkout-band checkout-step-panel"
          >
            <div class="checkout-section-head">
              <h2>{{ t("checkoutPage.purchaseTitle") }}</h2>
              <p>{{ t("checkoutPage.purchaseHelp") }}</p>
            </div>

            <div class="checkout-next-step">
              <div>
                <strong>{{ t("checkoutPage.myidStatusVerified") }}</strong>
                <p>{{ currentStatusHint }}</p>
              </div>

              <button
                type="button"
                class="checkout-primary-btn"
                :disabled="!installmentReadyToSubmitCredit || creditSubmitLoading"
                @click="submitInstallmentCredit"
              >
                {{ purchaseActionLabel }}
              </button>
            </div>
          </section>

          <section
            v-if="activeInstallmentStepKey === 'complete'"
            class="checkout-band checkout-step-panel checkout-complete-panel"
          >
            <div class="checkout-next-step">
              <div>
                <strong>{{ t("checkoutPage.stepComplete") }}</strong>
                <p>{{ currentStatusHint || t("checkoutPage.myidHintCompleted") }}</p>
              </div>

              <button
                type="button"
                class="checkout-primary-btn"
                @click="router.push('/profile/orders')"
              >
                {{ t("profile.orders") }}
              </button>
            </div>
          </section>
        </template>

        <section v-else class="checkout-band">
          <div class="checkout-section-head">
            <h2>{{ t("info") }}</h2>
            <p>{{ t("checkoutPage.formHelp") }}</p>
          </div>

          <div class="checkout-form-grid">
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
                @input="
                  !isCustomerLocked &&
                  (checkoutForm.phone = formatUzbekistanPhoneInput($event.target.value))
                "
              />
            </label>
          </div>

          <div class="checkout-actions">
            <button
              type="button"
              class="checkout-primary-btn"
              :disabled="isStraightPaymentButtonDisabled"
              @click="submitStraightPayment"
            >
              {{
                clickSubmitLoading
                  ? t("checkoutPage.submitClick")
                  : t("checkoutPage.submitClick")
              }}
            </button>
          </div>
        </section>
      </main>

      <aside class="checkout-sidebar">
        <section class="checkout-summary-panel">
          <div class="checkout-section-head compact">
            <h2>{{ t("checkoutPage.summaryTitle") }}</h2>
            <p>
              {{
                isInstallmentJourney
                  ? t("checkoutPage.installmentOption")
                  : t("checkoutPage.oneTimeOption")
              }}
            </p>
          </div>

          <div class="checkout-summary-row">
            <span>{{ t("checkoutPage.productsCount") }}</span>
            <strong>{{ basketItemCount }}</strong>
          </div>

          <div class="checkout-summary-row">
            <span>{{ t("allBasket") }}</span>
            <strong>{{ totalAmountFormatted }}</strong>
          </div>

          <div v-if="isInstallmentJourney" class="checkout-summary-row">
            <span>{{ t("checkoutPage.monthlyPaymentTotal") }}</span>
            <strong>{{ totalMonthlyInstallmentFormatted }}</strong>
          </div>

          <div
            v-if="isInstallmentJourney && needsInitialPayment"
            class="checkout-summary-row"
          >
            <span>{{ t("checkoutPage.initialPayment") }}</span>
            <strong>{{ totalInitialPaymentFormatted }}</strong>
          </div>

          <p class="checkout-summary-note">
            {{
              isInstallmentJourney
                ? currentStatusHint || t("checkoutPage.purchaseHelp")
                : t("checkoutPage.clickDescription")
            }}
          </p>
        </section>
      </aside>
    </div>

    <div v-else class="checkout-empty-state">
      <p class="checkout-empty-title">{{ t("empty") }}</p>
      <p class="checkout-empty-copy">
        {{ showStatusCard ? currentStatusHint : t("checkoutPage.emptyAction") }}
      </p>
      <button type="button" class="checkout-primary-btn" @click="router.push('/products')">
        {{ t("checkoutPage.continueShopping") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.checkout-page {
  color: #1f2933;
}

.checkout-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 18px;
  border: 1px solid #e3ebe5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbf8 100%);
  box-shadow: 0 14px 38px rgba(31, 41, 51, 0.06);
}

.checkout-back,
.checkout-primary-btn,
.checkout-secondary-btn,
.checkout-flow-btn,
.checkout-installment-btn {
  border-radius: 8px;
}

.checkout-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid #d8e4dc;
  background: #ffffff;
  color: #21442c;
  box-shadow: 0 8px 18px rgba(31, 41, 51, 0.05);
}

.checkout-kicker {
  margin: 0 0 4px;
  font-size: 0.85rem;
  font-weight: 800;
  color: #5f7167;
  text-transform: uppercase;
}

.checkout-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.9rem;
  font-weight: 800;
  color: #1f2933;
}

.checkout-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 24px;
  align-items: start;
}

.checkout-main {
  display: grid;
  gap: 16px;
}

.checkout-band,
.checkout-status-card,
.checkout-summary-panel,
.checkout-empty-state {
  border: 1px solid #e3ebe5;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 42px rgba(31, 41, 51, 0.06);
}

.checkout-band,
.checkout-status-card,
.checkout-summary-panel,
.checkout-empty-state {
  border-radius: 8px;
}

.checkout-band,
.checkout-summary-panel,
.checkout-empty-state {
  padding: 22px;
}

.checkout-section-head {
  margin-bottom: 16px;
}

.checkout-section-head.compact {
  margin-bottom: 12px;
}

.checkout-section-head h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #1f2933;
}

.checkout-section-head p {
  margin: 6px 0 0;
  color: #64736a;
  font-size: 0.95rem;
  line-height: 1.5;
}

.checkout-flow-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.checkout-flow-btn {
  display: grid;
  gap: 6px;
  padding: 16px;
  text-align: left;
  border: 1px solid #d8e4dc;
  background: #fbfdfb;
  color: #1f2933;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.checkout-flow-btn.active {
  border-color: #2f7d46;
  background: #f2fbf5;
  box-shadow: 0 10px 28px rgba(47, 125, 70, 0.1);
}

.checkout-flow-btn.disabled {
  opacity: 0.55;
}

.checkout-flow-btn:not(:disabled):hover {
  transform: translateY(-1px);
  border-color: #b8d8c2;
}

.checkout-flow-title {
  font-size: 1rem;
  font-weight: 700;
}

.checkout-flow-copy {
  font-size: 0.92rem;
  color: #64736a;
  line-height: 1.45;
}

.checkout-stepper {
  display: flex;
  align-items: stretch;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.checkout-step {
  position: relative;
  min-width: 150px;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e3ebe5;
  border-radius: 8px;
  background: #fbfdfb;
}

.checkout-step:not(:last-child)::after {
  content: "";
  position: absolute;
  right: -11px;
  top: 50%;
  width: 10px;
  height: 2px;
  background: #d8e4dc;
  transform: translateY(-50%);
}

.checkout-step.is-done {
  border-color: #9bd6ad;
  background: #f2fbf5;
  opacity: 0.68;
}

.checkout-step.is-active {
  border-color: #2f7d46;
  background: #f0fdf4;
  box-shadow: 0 12px 28px rgba(47, 125, 70, 0.12);
}

.checkout-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #6d7f73;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
}

.checkout-step.is-done .checkout-step-number {
  background: #2f7d46;
  color: #ffffff;
}

.checkout-step.is-active .checkout-step-number {
  background: #21442c;
}

.checkout-step-label {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
}

.checkout-step-panel {
  animation: checkoutStepEnter 0.22s ease both;
}

@keyframes checkoutStepEnter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.checkout-products {
  display: grid;
  gap: 12px;
}

.checkout-product-row {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 14px;
  padding: 14px;
  border: 1px solid #e3ebe5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgba(31, 41, 51, 0.04);
}

.checkout-product-media {
  width: 88px;
  height: 88px;
  border-radius: 8px;
  overflow: hidden;
  background: #eef6f0;
}

.checkout-product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.checkout-product-copy {
  display: grid;
  gap: 10px;
}

.checkout-product-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: start;
}

.checkout-product-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #1f2933;
}

.checkout-product-price {
  white-space: nowrap;
  font-size: 0.98rem;
  color: #2f7d46;
}

.checkout-product-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.checkout-option-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid #e3ebe5;
  border-radius: 999px;
  background: #f7fbf8;
  font-size: 0.82rem;
  color: #4c5f54;
}

.checkout-installment-picker {
  display: grid;
  gap: 10px;
}

.checkout-installment-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: #64736a;
}

.checkout-installment-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.checkout-installment-btn {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #d8e4dc;
  background: #ffffff;
  color: #1f2933;
  font-weight: 700;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    color 0.2s ease;
}

.checkout-installment-btn.active {
  border-color: #2f7d46;
  background: #f0fdf4;
  color: #21442c;
}

.checkout-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.checkout-field {
  display: grid;
  gap: 8px;
}

.checkout-field-wide {
  grid-column: 1 / -1;
}

.checkout-field span {
  font-size: 0.9rem;
  font-weight: 700;
  color: #4c5f54;
}

.checkout-input {
  min-height: 46px;
  width: 100%;
  padding: 0 14px;
  border: 1px solid #d8e4dc;
  border-radius: 8px;
  background: #fbfdfb;
  color: #1f2933;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.checkout-input:focus {
  outline: none;
  border-color: #2f7d46;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(47, 125, 70, 0.12);
}

.checkout-date-input-wrap {
  display: grid;
  gap: 6px;
}

.checkout-date-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.checkout-date-input {
  font-weight: 800;
  letter-spacing: 0.04em;
}

.checkout-date-input::placeholder {
  color: #8aa095;
  letter-spacing: 0;
}

.checkout-date-input-wrap small {
  color: #64736a;
  font-size: 0.78rem;
  font-weight: 700;
}

.checkout-date-picker-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 46px;
  border: 1px solid #d8e4dc;
  border-radius: 8px;
  background: #ffffff;
  color: #21442c;
  padding: 0 12px;
  font-size: 0.86rem;
  font-weight: 800;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.checkout-date-picker-btn:hover {
  border-color: #b8d8c2;
  background: #f7fbf8;
  transform: translateY(-1px);
}

.checkout-native-date-input {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.checkout-verified-box,
.checkout-next-step {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid #c8ead2;
  border-radius: 8px;
  background: #f2fbf5;
}

.checkout-myid-return-box {
  display: grid;
  gap: 16px;
  padding: 16px;
  border: 1px solid #c8ead2;
  border-radius: 8px;
  background: #f2fbf5;
}

.checkout-myid-return-box strong {
  display: block;
  margin-bottom: 4px;
  color: #21442c;
  font-size: 1rem;
}

.checkout-myid-return-box p {
  margin: 0;
  color: #386247;
  line-height: 1.5;
}

.checkout-myid-return-box .checkout-primary-btn {
  justify-self: end;
}

.checkout-payment-focus {
  border-color: #9bd6ad;
  background: linear-gradient(180deg, #ffffff 0%, #f2fbf5 100%);
}

.checkout-payment-focus .checkout-section-head {
  max-width: 620px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.checkout-payment-focus .checkout-next-step {
  width: min(620px, 100%);
  margin: 0 auto;
  border-color: #c8ead2;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(47, 125, 70, 0.1);
}

.checkout-complete-panel {
  border-color: #c8ead2;
  background: #f2fbf5;
}

.checkout-verified-box strong,
.checkout-next-step strong {
  display: block;
  margin-bottom: 4px;
  font-size: 1rem;
  color: #21442c;
}

.checkout-verified-box p,
.checkout-next-step p,
.checkout-next-step span {
  margin: 0;
  color: #386247;
  line-height: 1.5;
}

.checkout-verified-meta {
  margin-top: 4px !important;
  font-size: 0.9rem;
}

.checkout-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.checkout-step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.checkout-primary-btn,
.checkout-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid #21442c;
  background: #21442c;
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 10px 24px rgba(33, 68, 44, 0.14);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.checkout-secondary-btn {
  border-color: #d8e4dc;
  background: #ffffff;
  color: #21442c;
  box-shadow: none;
}

.checkout-primary-btn:not(:disabled):hover,
.checkout-secondary-btn:not(:disabled):hover {
  transform: translateY(-1px);
}

.checkout-primary-btn:not(:disabled):hover {
  border-color: #2f7d46;
  background: #2f7d46;
  box-shadow: 0 14px 28px rgba(47, 125, 70, 0.16);
}

.checkout-secondary-btn:not(:disabled):hover {
  border-color: #b8d8c2;
  background: #f7fbf8;
}

.checkout-primary-btn:disabled,
.checkout-secondary-btn:disabled,
.checkout-flow-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.checkout-summary-panel {
  position: sticky;
  top: 104px;
}

.checkout-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #edf2ee;
}

.checkout-summary-row:first-of-type {
  border-top: none;
  padding-top: 0;
}

.checkout-summary-row span {
  color: #64736a;
}

.checkout-summary-row strong {
  color: #1f2933;
}

.checkout-summary-note {
  margin: 16px 0 0;
  color: #64736a;
  line-height: 1.6;
}

.checkout-status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 18px;
}

.checkout-status-card.is-success {
  border-color: #c8ead2;
  background: #f2fbf5;
}

.checkout-status-card.is-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.checkout-status-card.is-pending {
  border-color: #f0d68a;
  background: #fffaf0;
}

.checkout-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #ffffff;
  color: #21442c;
  flex-shrink: 0;
}

.checkout-status-copy {
  flex: 1;
  min-width: 0;
}

.checkout-status-kicker {
  margin: 0 0 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64736a;
}

.checkout-status-copy h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #1f2933;
}

.checkout-status-copy p {
  margin: 6px 0 0;
  color: #4c5f54;
  line-height: 1.5;
}

.checkout-alert {
  display: block;
  margin-bottom: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.checkout-alert.is-success {
  border-color: #c8ead2;
  background: #f2fbf5;
  color: #386247;
}

.checkout-inline-alert {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 16px;
  align-items: stretch;
}

.checkout-inline-alert strong {
  display: block;
  margin-bottom: 4px;
}

.checkout-inline-alert p {
  margin: 0;
}

.checkout-inline-alert .checkout-primary-btn {
  align-self: flex-end;
}

.checkout-empty-state {
  display: grid;
  gap: 12px;
  justify-items: start;
}

.checkout-empty-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.checkout-empty-copy {
  margin: 0;
  color: #64736a;
  line-height: 1.6;
}

@media (max-width: 980px) {
  .checkout-shell {
    grid-template-columns: 1fr;
  }

  .checkout-summary-panel {
    position: static;
  }
}

@media (max-width: 720px) {
  .checkout-page {
    padding-left: 12px;
    padding-right: 12px;
    padding-top: 28px;
  }

  .checkout-head {
    gap: 12px;
    margin-bottom: 14px;
    padding: 12px;
  }

  .checkout-back {
    width: 40px;
    height: 40px;
  }

  .checkout-title {
    font-size: 1.28rem;
    line-height: 1.2;
  }

  .checkout-kicker {
    font-size: 0.72rem;
  }

  .checkout-flow-switch,
  .checkout-form-grid {
    grid-template-columns: 1fr;
  }

  .checkout-main {
    gap: 12px;
  }

  .checkout-band,
  .checkout-summary-panel,
  .checkout-empty-state {
    padding: 14px;
  }

  .checkout-section-head {
    margin-bottom: 12px;
  }

  .checkout-section-head h2 {
    font-size: 1rem;
  }

  .checkout-section-head p {
    font-size: 0.88rem;
  }

  .checkout-flow-btn {
    min-height: 86px;
    padding: 13px;
  }

  .checkout-flow-title {
    font-size: 0.95rem;
  }

  .checkout-flow-copy {
    font-size: 0.84rem;
  }

  .checkout-stepper {
    margin-inline: -2px;
    padding: 0 2px 6px;
    scroll-snap-type: x mandatory;
  }

  .checkout-step {
    min-width: 176px;
    scroll-snap-align: start;
    padding: 10px;
  }

  .checkout-step-label {
    font-size: 0.84rem;
  }

  .checkout-product-row {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
  }

  .checkout-product-media {
    width: 64px;
    height: 64px;
  }

  .checkout-product-copy {
    gap: 8px;
  }

  .checkout-product-head {
    gap: 6px;
  }

  .checkout-product-head h3 {
    font-size: 0.92rem;
  }

  .checkout-product-price {
    font-size: 0.9rem;
  }

  .checkout-option-chip {
    min-height: 28px;
    padding: 0 8px;
    font-size: 0.75rem;
  }

  .checkout-installment-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
    font-size: 0.82rem;
  }

  .checkout-installment-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .checkout-installment-btn {
    min-height: 40px;
  }

  .checkout-input {
    min-height: 48px;
    font-size: 16px;
  }

  .checkout-date-row {
    grid-template-columns: 1fr;
  }

  .checkout-date-picker-btn {
    min-height: 44px;
  }

  .checkout-product-head,
  .checkout-verified-box,
  .checkout-next-step,
  .checkout-status-card,
  .checkout-inline-alert {
    flex-direction: column;
    align-items: stretch;
  }

  .checkout-status-card {
    gap: 10px;
    padding: 12px;
  }

  .checkout-status-icon {
    width: 34px;
    height: 34px;
  }

  .checkout-status-copy h2 {
    font-size: 1rem;
  }

  .checkout-status-copy p {
    font-size: 0.88rem;
  }

  .checkout-payment-focus .checkout-section-head {
    text-align: left;
  }

  .checkout-summary-panel {
    box-shadow: 0 10px 28px rgba(31, 41, 51, 0.05);
  }

  .checkout-summary-row {
    padding: 9px 0;
  }

  .checkout-summary-note {
    font-size: 0.88rem;
  }

  .checkout-actions {
    justify-content: stretch;
  }

  .checkout-step-actions {
    justify-content: stretch;
  }

  .checkout-primary-btn,
  .checkout-secondary-btn {
    width: 100%;
    min-height: 48px;
  }
}

@media (max-width: 430px) {
  .checkout-page {
    padding-left: 10px;
    padding-right: 10px;
  }

  .checkout-head {
    align-items: flex-start;
  }

  .checkout-title {
    font-size: 1.14rem;
  }

  .checkout-flow-switch {
    gap: 8px;
  }

  .checkout-product-row {
    grid-template-columns: 1fr;
  }

  .checkout-product-media {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .checkout-product-head {
    align-items: flex-start;
  }

  .checkout-product-price {
    white-space: normal;
  }
}
</style>
