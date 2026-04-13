<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { CircleCheckBig, Clock3, CreditCard, RefreshCw, ShoppingCart } from "lucide-vue-next";

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
  myIdPinfl: "",
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

const installmentStepItems = computed(() => {
  const steps = [
    {
      key: "tariff",
      label: t("checkoutPage.stepTariff"),
      done: allInstallmentPlansSelected.value,
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
  return steps
    .map((step, index) => ({
      ...step,
      number: index + 1,
      state: step.done ? "done" : index === firstPendingIndex ? "active" : "todo",
    }))
    .filter((step) => step.state !== "done");
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

const openMyIdBlankTab = () => {
  const popup = window.open("about:blank", "_blank");
  if (popup) {
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
              background: #f6f7f4;
              color: #171717;
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
              color: #525252;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="myid-loading">
            <strong>MyID yuklanmoqda...</strong>
            <span>Sahifa tayyor bo'lgach avtomatik ochiladi.</span>
          </div>
        </body>
      </html>
    `);
    popup.document.close();
  }
  return popup;
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

  const pinfl = normalizeMyIdPinflInput(checkoutForm.value.myIdPinfl);
  const passData = normalizeMyIdPassportInput(checkoutForm.value.myIdPassport);
  const birthDate = String(checkoutForm.value.myIdBirthDate || "").trim();

  if ((!pinfl && !passData) || !birthDate) {
    pageError.value = t("checkoutPage.myidMissingIdentity");
    return;
  }

  myIdStartLoading.value = true;
  let myIdTab = null;

  try {
    myIdTab = openMyIdBlankTab();
    const response = await apiClient.post("/payments/myid/initiate", {
      ...payload,
      pinfl: pinfl || null,
      pass_data: passData || null,
      birth_date: birthDate,
      lang: locale.value,
    });

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

    if (myIdTab && !myIdTab.closed) {
      try {
        myIdTab.location.href = redirectUrl;
      } catch {
        myIdTab.location.replace(redirectUrl);
      }
    } else {
      window.open(redirectUrl, "_blank") || (window.location.href = redirectUrl);
    }
  } catch (error) {
    if (myIdTab && !myIdTab.closed) {
      myIdTab.close();
    }
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

    <div
      v-if="showStatusCard"
      :class="['checkout-status-card', `is-${currentStatusVariant}`]"
    >
      <div class="checkout-status-icon">
        <CircleCheckBig v-if="currentStatusVariant === 'success'" class="h-5 w-5" />
        <Clock3 v-else class="h-5 w-5" />
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
        class="checkout-secondary-btn"
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

    <div v-if="showMyIdConfirmCard" class="checkout-alert is-success checkout-inline-alert">
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

        <section class="checkout-band">
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
        </section>

        <template v-if="isInstallmentJourney">
          <section class="checkout-band">
            <div class="checkout-section-head">
              <h2>{{ t("checkoutPage.verificationTitle") }}</h2>
              <p>{{ t("checkoutPage.verificationHelp") }}</p>
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
                  @input="
                    checkoutForm.myIdPassport = normalizeMyIdPassportInput($event.target.value)
                  "
                />
              </label>

              <label class="checkout-field checkout-field-wide">
                <span>{{ t("orderModal.birthDate") }}</span>
                <input
                  v-model="checkoutForm.myIdBirthDate"
                  type="date"
                  class="checkout-input"
                />
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
          </section>

          <section v-if="needsInitialPayment" class="checkout-band">
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

          <section v-else class="checkout-band">
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
  color: #171717;
}

.checkout-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
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
  border: 1px solid #d4d4d4;
  background: #ffffff;
  color: #171717;
}

.checkout-kicker {
  margin: 0 0 4px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #737373;
}

.checkout-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 1.9rem;
  font-weight: 800;
  color: #171717;
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
  border: 1px solid #e5e5e5;
  background: #ffffff;
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
  padding: 20px;
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
  font-weight: 700;
  color: #171717;
}

.checkout-section-head p {
  margin: 6px 0 0;
  color: #525252;
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
  padding: 14px;
  text-align: left;
  border: 1px solid #d4d4d4;
  background: #fafaf9;
  color: #171717;
}

.checkout-flow-btn.active {
  border-color: #14532d;
  background: #f0fdf4;
}

.checkout-flow-btn.disabled {
  opacity: 0.55;
}

.checkout-flow-title {
  font-size: 1rem;
  font-weight: 700;
}

.checkout-flow-copy {
  font-size: 0.92rem;
  color: #525252;
  line-height: 1.45;
}

.checkout-stepper {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.checkout-step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fafaf9;
}

.checkout-step.is-done {
  border-color: #16a34a;
  background: #f0fdf4;
}

.checkout-step.is-active {
  border-color: #ca8a04;
  background: #fffbeb;
}

.checkout-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #262626;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
}

.checkout-step.is-done .checkout-step-number {
  background: #16a34a;
}

.checkout-step.is-active .checkout-step-number {
  background: #ca8a04;
}

.checkout-step-label {
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.4;
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
  border: 1px solid #ececec;
  border-radius: 8px;
}

.checkout-product-media {
  width: 88px;
  height: 88px;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f4;
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
  font-weight: 700;
  color: #171717;
}

.checkout-product-price {
  white-space: nowrap;
  font-size: 0.98rem;
  color: #14532d;
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
  border: 1px solid #e5e5e5;
  border-radius: 999px;
  background: #fafaf9;
  font-size: 0.82rem;
  color: #404040;
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
  color: #525252;
}

.checkout-installment-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.checkout-installment-btn {
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid #d4d4d4;
  background: #ffffff;
  color: #171717;
  font-weight: 600;
}

.checkout-installment-btn.active {
  border-color: #14532d;
  background: #f0fdf4;
  color: #14532d;
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
  font-weight: 600;
  color: #404040;
}

.checkout-input {
  min-height: 46px;
  width: 100%;
  padding: 0 14px;
  border: 1px solid #d4d4d4;
  border-radius: 8px;
  background: #ffffff;
  color: #171717;
}

.checkout-input:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
}

.checkout-verified-box,
.checkout-next-step {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid #dcfce7;
  border-radius: 8px;
  background: #f0fdf4;
}

.checkout-verified-box strong,
.checkout-next-step strong {
  display: block;
  margin-bottom: 4px;
  font-size: 1rem;
  color: #14532d;
}

.checkout-verified-box p,
.checkout-next-step p,
.checkout-next-step span {
  margin: 0;
  color: #166534;
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

.checkout-primary-btn,
.checkout-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid #171717;
  background: #171717;
  color: #ffffff;
  font-weight: 700;
}

.checkout-secondary-btn {
  border-color: #d4d4d4;
  background: #ffffff;
  color: #171717;
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
  border-top: 1px solid #f1f1f1;
}

.checkout-summary-row:first-of-type {
  border-top: none;
  padding-top: 0;
}

.checkout-summary-row span {
  color: #525252;
}

.checkout-summary-row strong {
  color: #171717;
}

.checkout-summary-note {
  margin: 16px 0 0;
  color: #525252;
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
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.checkout-status-card.is-error {
  border-color: #fecaca;
  background: #fef2f2;
}

.checkout-status-card.is-pending {
  border-color: #fde68a;
  background: #fffbeb;
}

.checkout-status-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #ffffff;
  color: #171717;
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
  color: #525252;
}

.checkout-status-copy h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #171717;
}

.checkout-status-copy p {
  margin: 6px 0 0;
  color: #404040;
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
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.checkout-inline-alert {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.checkout-inline-alert strong {
  display: block;
  margin-bottom: 4px;
}

.checkout-inline-alert p {
  margin: 0;
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
  color: #525252;
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
    padding-left: 16px;
    padding-right: 16px;
  }

  .checkout-title {
    font-size: 1.5rem;
  }

  .checkout-flow-switch,
  .checkout-form-grid {
    grid-template-columns: 1fr;
  }

  .checkout-product-row {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .checkout-product-media {
    width: 72px;
    height: 72px;
  }

  .checkout-product-head,
  .checkout-verified-box,
  .checkout-next-step,
  .checkout-status-card,
  .checkout-inline-alert {
    flex-direction: column;
    align-items: stretch;
  }

  .checkout-actions {
    justify-content: stretch;
  }

  .checkout-primary-btn,
  .checkout-secondary-btn {
    width: 100%;
  }
}
</style>
