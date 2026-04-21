<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

import { apiClient, getApiErrorMessage } from "@/lib/api";
import {
  formatCustomerPhone,
  getStoredCustomerSession,
  normalizeCustomerPhone,
} from "@/lib/customerSession";

const router = useRouter();
const { t, locale } = useI18n();

const customerSession = ref(null);
const orders = ref([]);
const loading = ref(false);
const errorMessage = ref("");
const monthlyPaymentLoadingByOrderId = ref({});
let inFlightOrdersPromise = null;

const customerPhone = computed(() => normalizeCustomerPhone(customerSession.value?.phone));
const resolvedCustomerAddress = computed(() => {
  const sessionAddress = String(customerSession.value?.address || "").trim();
  if (sessionAddress) {
    return sessionAddress;
  }

  for (const order of orders.value || []) {
    const orderAddress = String(order?.customer_address || "").trim();
    if (orderAddress) {
      return orderAddress;
    }
  }

  return "";
});

const statusLabel = (status = "") => {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const labels = {
    pending: t("checkoutPage.statusPending"),
    prepared: t("checkoutPage.statusPrepared"),
    completed: t("checkoutPage.statusCompleted"),
    canceled: t("checkoutPage.statusCancelled"),
    cancelled: t("checkoutPage.statusCancelled"),
  };

  return labels[normalizedStatus] || t("checkoutPage.statusUnknown");
};

const monthlyPaymentStatusLabel = (payment = {}) => {
  const status = String(payment?.status || "").trim().toLowerCase();
  if (status === "completed") {
    return payment?.ican_error_note
      ? t("profile.monthlyPaymentClickPaid")
      : t("profile.monthlyPaymentCompleted");
  }
  if (status === "prepared") {
    return t("profile.monthlyPaymentPrepared");
  }
  if (status === "cancelled") {
    return t("profile.monthlyPaymentCancelled");
  }
  return t("profile.monthlyPaymentPending");
};

const monthlyPaymentStatusClass = (payment = {}) => {
  const status = String(payment?.status || "").trim().toLowerCase();
  if (status === "completed" && !payment?.ican_error_note) {
    return "is-success";
  }
  if (status === "completed" && payment?.ican_error_note) {
    return "is-warning";
  }
  if (status === "cancelled") {
    return "is-error";
  }
  return "is-muted";
};

const paymentLabel = (order = {}) => {
  if (orderIsInstallment(order)) {
    return t("profile.installmentPayment");
  }

  const method = String(order?.payment_method || "").trim().toLowerCase();
  if (method === "click") {
    return t("profile.oneTimePayment");
  }
  return t("profile.cashPayment");
};

const getIcanCreditStatusValue = (order = {}) =>
  String(order?.ican_credit?.status || "").trim().toLowerCase();

const getIcanCreditStatusLabel = (order = {}) => {
  const status = getIcanCreditStatusValue(order);
  const labels = {
    active: t("profile.creditStatusActive"),
    approved: t("profile.creditStatusApproved"),
    canceled: t("profile.creditStatusCancelled"),
    cancelled: t("profile.creditStatusCancelled"),
    closed: t("profile.creditStatusClosed"),
    completed: t("profile.creditStatusCompleted"),
    draft: t("profile.creditStatusPending"),
    new: t("profile.creditStatusPending"),
    pending: t("profile.creditStatusPending"),
  };

  if (!status && (order?.credit_submitted || orderIsInstallment(order))) {
    return t("profile.creditStatusPending");
  }

  return (
    labels[status] ||
    String(order?.ican_credit?.status_label || "").trim() ||
    ((order?.credit_submitted || orderIsInstallment(order)) &&
    t("profile.creditStatusPending")) ||
    t("checkoutPage.statusUnknown")
  );
};

const getIcanCreditStatusClass = (order = {}) => {
  const status = getIcanCreditStatusValue(order);
  if (!status && (order?.credit_submitted || orderIsInstallment(order))) {
    return "is-warning";
  }
  if (["active", "approved", "completed"].includes(status)) {
    return "is-success";
  }
  if (["canceled", "cancelled"].includes(status)) {
    return "is-error";
  }
  if (["draft", "new", "pending"].includes(status)) {
    return "is-warning";
  }
  return "is-muted";
};

const getIcanCreditReason = (order = {}) => {
  const cancelReason = String(order?.ican_credit?.cancel_reason || "").trim();
  if (cancelReason) {
    return cancelReason;
  }

  const status = getIcanCreditStatusValue(order);
  if (!["canceled", "cancelled"].includes(status)) {
    return "";
  }

  return String(order?.ican_credit?.comment || "").trim();
};

const getOrderStatusValue = (order = {}) => {
  if (orderIsInstallment(order) && getIcanCreditStatusValue(order)) {
    return getIcanCreditStatusValue(order);
  }

   if (orderIsInstallment(order) && order?.credit_submitted) {
    return "pending";
  }

  return String(order?.status || "").trim().toLowerCase();
};

const getOrderStatusLabel = (order = {}) => {
  if (orderIsInstallment(order) && getIcanCreditStatusValue(order)) {
    return getIcanCreditStatusLabel(order);
  }

  return statusLabel(order?.status);
};

const getOrderStatusClass = (order = {}) => {
  const status = getOrderStatusValue(order);
  if (["active", "approved", "completed"].includes(status)) {
    return "is-success";
  }
  if (["canceled", "cancelled"].includes(status)) {
    return "is-error";
  }
  if (["pending", "prepared", "draft", "new"].includes(status)) {
    return "is-warning";
  }
  return "is-muted";
};

const formatMoney = (value) => {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat(locale.value === "ru" ? "ru-RU" : "uz-UZ").format(
    Math.round(numericValue)
  );
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const normalizedValue = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T");
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(locale.value === "ru" ? "ru-RU" : "uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatOrderCreatedDate = (value) => {
  if (!value) {
    return "";
  }

  const normalizedValue = String(value).includes("T")
    ? String(value)
    : String(value).replace(" ", "T");
  const date = new Date(normalizedValue);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const getProductMonthlyPayment = (product = {}) => {
  const creditPlan = product?.credit_plan || {};
  return Number(creditPlan.monthly_payment || creditPlan.monthlyPayment || 0);
};

const getProductCreditMonths = (product = {}) => {
  const months = Number(product?.credit_plan?.months || 0);
  return Number.isFinite(months) && months > 0 ? months : 0;
};

const getProductCreditMonthsLabel = (product = {}) => {
  const months = getProductCreditMonths(product);
  return months ? `${months} ${t("credit.months")}` : "";
};

const getProductQuantity = (product = {}) => {
  const quantity = Number(product?.quantity || 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
};

const getProductTotal = (product = {}) => {
  const price = Number(product?.price || 0);
  return price * getProductQuantity(product);
};

const getProductCreditTotal = (product = {}) => {
  const creditPlan = product?.credit_plan || {};
  const creditTotal = Number(creditPlan.total || 0);
  if (Number.isFinite(creditTotal) && creditTotal > 0) {
    return creditTotal * getProductQuantity(product);
  }

  const monthlyPayment = getProductMonthlyPayment(product);
  const months = Number(creditPlan.months || 0);
  if (monthlyPayment > 0 && Number.isFinite(months) && months > 0) {
    return monthlyPayment * months * getProductQuantity(product);
  }

  return getProductTotal(product);
};

const getOrderMonthlyPaymentAmount = (order = {}) => {
  const backendAmount = Number(order?.monthly_payment_amount || 0);
  if (Number.isFinite(backendAmount) && backendAmount > 0) {
    return backendAmount;
  }

  return (order?.products || []).reduce(
    (sum, product) => sum + getProductMonthlyPayment(product) * getProductQuantity(product),
    0
  );
};

const orderIsInstallment = (order = {}) =>
  String(order?.payment_method || "").trim().toLowerCase() === "myid" ||
  Number(order?.myid_result_code || 0) === 1 ||
  (order?.products || []).some((product) => Boolean(product?.credit_plan));

const getOrderCreditTotal = (order = {}) =>
  (order?.products || []).reduce(
    (sum, product) => sum + getProductCreditTotal(product),
    0
  );

const getOrderDisplayTotal = (order = {}) => {
  if (orderIsInstallment(order)) {
    return getOrderCreditTotal(order) || Number(order?.total || 0);
  }

  const productsTotal = (order?.products || []).reduce(
    (sum, product) => sum + getProductTotal(product),
    0
  );

  return productsTotal || Number(order?.total || 0);
};

const getOrderInitialPaymentTotal = (order = {}) =>
  (order?.products || []).reduce((sum, product) => {
    if (!product?.initial_payment_enabled) {
      return sum;
    }

    const amount = Number(product?.initial_payment_amount || 0);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0) * getProductQuantity(product);
  }, 0);

const getCompletedMonthlyPaymentsTotal = (order = {}) =>
  (order?.monthly_payments || []).reduce((sum, payment) => {
    if (String(payment?.status || "").trim().toLowerCase() !== "completed") {
      return sum;
    }

    const amount = Number(payment?.amount || 0);
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0);
  }, 0);

const getOrderPaidAmount = (order = {}) => {
  const status = String(order?.status || "").trim().toLowerCase();
  if (orderIsInstallment(order)) {
    const initialPaymentTotal = getOrderInitialPaymentTotal(order);
    const paidInitial = status === "completed" && initialPaymentTotal > 0 ? initialPaymentTotal : 0;
    return paidInitial + getCompletedMonthlyPaymentsTotal(order);
  }

  return status === "completed" ? getOrderDisplayTotal(order) : 0;
};

const getOrderRemainingAmount = (order = {}) => {
  if (orderIsInstallment(order)) {
    const creditTotal = getOrderCreditTotal(order) || getOrderDisplayTotal(order);
    const paidInitialPayment = getOrderPaidAmount(order);
    return Math.max(creditTotal - paidInitialPayment, 0);
  }

  return Math.max(getOrderDisplayTotal(order) - getOrderPaidAmount(order), 0);
};

const getOrderTotalLabel = (order = {}) =>
  orderIsInstallment(order) ? t("profile.totalWithPercent") : t("profile.totalAmount");

const hasMonthlyPaymentBalance = (order = {}) =>
  orderIsInstallment(order) &&
  getOrderMonthlyPaymentAmount(order) > 0 &&
  getOrderRemainingAmount(order) > 0;

const shouldShowMonthlyPaymentButton = (order = {}) =>
  hasMonthlyPaymentBalance(order) && Boolean(order?.can_pay_monthly);

const shouldShowMonthlyPaymentNotice = (order = {}) =>
  hasMonthlyPaymentBalance(order) && !order?.can_pay_monthly;

const canPayMonthly = (order = {}) =>
  shouldShowMonthlyPaymentButton(order) &&
  !isMonthlyPaymentLoading(order.id);

const getMonthlyPaymentButtonLabel = (order = {}) => {
  if (isMonthlyPaymentLoading(order.id)) {
    return t("profile.monthlyPaymentOpening");
  }

  return `${t("profile.payMonthly")} - ${formatMoney(getOrderMonthlyPaymentAmount(order))} ${t("uzs")}`;
};

const getMonthlyPaymentNotice = (order = {}) => {
  const status = String(order?.status || "").trim().toLowerCase();
  if (status === "completed") {
    return t("profile.monthlyPaymentCreditIdMissing");
  }

  return t("profile.monthlyPaymentPendingCredit");
};

const isMonthlyPaymentLoading = (orderId) =>
  Boolean(monthlyPaymentLoadingByOrderId.value[orderId]);

const setMonthlyPaymentLoading = (orderId, value) => {
  monthlyPaymentLoadingByOrderId.value = {
    ...monthlyPaymentLoadingByOrderId.value,
    [orderId]: value,
  };
};

const startMonthlyPayment = async (order = {}) => {
  if (!canPayMonthly(order) || isMonthlyPaymentLoading(order.id)) {
    return;
  }

  setMonthlyPaymentLoading(order.id, true);
  errorMessage.value = "";

  try {
    const response = await apiClient.post(
      `/payments/orders/${order.id}/monthly-payment/initiate`,
      {
        amount: getOrderMonthlyPaymentAmount(order),
        phone: customerPhone.value,
        return_url: `${window.location.origin}/profile/orders`,
      },
      { skipAuth: true }
    );
    const paymentUrl = String(response.data?.payment_url || "").trim();
    if (!paymentUrl) {
      throw new Error(t("profile.monthlyPaymentUrlMissing"));
    }
    window.location.href = paymentUrl;
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("profile.monthlyPaymentStartError"));
  } finally {
    setMonthlyPaymentLoading(order.id, false);
  }
};

const formatOption = (option = {}) => {
  const label = String(option?.label || "").trim();
  const value = String(option?.value || "").trim();
  if (label && value && label !== value) {
    return `${label}: ${value}`;
  }
  return label || value;
};

const loadOrders = async () => {
  if (inFlightOrdersPromise) {
    return inFlightOrdersPromise;
  }

  if (!customerPhone.value) {
    router.push("/login");
    return;
  }

  const shouldShowLoader = !orders.value.length;
  if (shouldShowLoader) {
    loading.value = true;
  }
  errorMessage.value = "";

  inFlightOrdersPromise = apiClient
    .get("/payments/orders", {
      params: { phone: customerPhone.value },
      skipAuth: true,
      skipRetry: true,
    })
    .then((response) => {
      orders.value = Array.isArray(response.data?.orders) ? response.data.orders : [];
      errorMessage.value = "";
    })
    .catch((error) => {
      errorMessage.value = getApiErrorMessage(error, t("profile.ordersLoadError"));
      orders.value = [];
    })
    .finally(() => {
      if (shouldShowLoader) {
        loading.value = false;
      }
      inFlightOrdersPromise = null;
    });

  return inFlightOrdersPromise;
};

onMounted(() => {
  customerSession.value = getStoredCustomerSession();
  if (!customerSession.value) {
    router.push("/login");
    return;
  }

  loadOrders();
});
</script>

<template>
  <main class="profile-orders-page">
    <section class="profile-orders-hero">
      <div>
        <div class="profile-orders-title-row">
          <button type="button" class="profile-orders-back" @click="router.push('/profile')">
            <span aria-hidden="true">‹</span>
            {{ t("nav.back") }}
          </button>
          <h1>{{ t("profile.orders") }}</h1>
        </div>
        <p>{{ t("profile.ordersSubtitle") }}</p>
      </div>
      <div v-if="customerSession" class="profile-orders-user">
        <strong>{{ customerSession.name }}</strong>
        <span>{{ formatCustomerPhone(customerSession.phone) }}</span>
        <span v-if="resolvedCustomerAddress">{{ resolvedCustomerAddress }}</span>
      </div>
    </section>

    <section class="profile-orders-content">
      <div v-if="loading" class="profile-orders-state">
        {{ t("profile.ordersLoading") }}
      </div>

      <div v-else-if="errorMessage" class="profile-orders-state is-error">
        <p>{{ errorMessage }}</p>
        <button type="button" @click="loadOrders">{{ t("checkoutPage.refreshStatus") }}</button>
      </div>

      <div v-else-if="!orders.length" class="profile-orders-state">
        <h2>{{ t("profile.emptyOrdersTitle") }}</h2>
        <p>{{ t("profile.emptyOrdersText") }}</p>
        <button type="button" @click="router.push('/products')">
          {{ t("seeProducts") }}
        </button>
      </div>

      <div v-else class="profile-orders-list">
        <article v-for="order in orders" :key="order.id" class="profile-order">
          <header class="profile-order-head">
            <div class="profile-order-head-main">
              <span v-if="formatOrderCreatedDate(order.created_at)" class="profile-order-created">
                {{ formatOrderCreatedDate(order.created_at) }}
              </span>
              <strong>{{ paymentLabel(order) }}</strong>
            </div>
            <div class="profile-order-status">
              <span :class="getOrderStatusClass(order)">{{ getOrderStatusLabel(order) }}</span>
              <small class="profile-order-id-badge">{{ t("profile.orderNumber") }} #{{ order.id }}</small>
            </div>
          </header>

          <div class="profile-order-products">
            <div
              v-for="(product, productIndex) in order.products || []"
              :key="`${order.id}-${product.id}-${product.name}-${productIndex}`"
              class="profile-order-product"
            >
              <div class="profile-order-product-main">
                <h2>{{ product.name || t("products.title") }}</h2>
                <p>
                  {{ Number(product.quantity || 1) }} x {{ formatMoney(product.price) }} {{ t("uzs") }}
                </p>
                <small
                  v-if="getProductCreditMonths(product)"
                  class="profile-order-credit-term"
                >
                  {{ t("credit.term") }}: {{ getProductCreditMonthsLabel(product) }}
                </small>
                <div v-if="product.selected_options?.length" class="profile-order-options">
                  <span
                    v-for="option in product.selected_options"
                    :key="formatOption(option)"
                  >
                    {{ formatOption(option) }}
                  </span>
                </div>
              </div>

              <div class="profile-order-product-price">
                <span v-if="getProductMonthlyPayment(product)">
                  {{ t("profile.monthlyPayment") }}
                </span>
                <strong v-if="getProductMonthlyPayment(product)">
                  {{ formatMoney(getProductMonthlyPayment(product)) }} {{ t("uzs") }}
                </strong>
                <strong v-else>
                  {{ formatMoney(getProductTotal(product)) }} {{ t("uzs") }}
                </strong>
              </div>
            </div>
          </div>

          <section
            v-if="order.ican_credit?.status || order.ican_credit?.number || getIcanCreditReason(order)"
            class="profile-order-credit-state"
          >
            <div class="profile-order-credit-state-head">
              <strong>{{ t("profile.creditApplication") }}</strong>
              <small v-if="order.ican_credit?.number">
                {{ t("profile.creditNumber") }} #{{ order.ican_credit.number }}
              </small>
            </div>

            <div class="profile-order-credit-state-body">
              <span :class="getIcanCreditStatusClass(order)">
                {{ getIcanCreditStatusLabel(order) }}
              </span>
              <small v-if="getIcanCreditReason(order)">
                {{ t("profile.creditCancelReason") }}: {{ getIcanCreditReason(order) }}
              </small>
            </div>
          </section>

          <section
            v-if="order.monthly_payments?.length"
            class="profile-order-monthly"
          >
            <div class="profile-order-monthly-head">
              <h3>{{ t("profile.monthlyPaymentsTitle") }}</h3>
              <span>{{ order.monthly_payments.length }}</span>
            </div>

            <div class="profile-order-monthly-list">
              <div
                v-for="payment in order.monthly_payments"
                :key="payment.id"
                class="profile-order-monthly-row"
              >
                <div>
                  <strong>{{ formatMoney(payment.amount) }} {{ t("uzs") }}</strong>
                  <small v-if="formatDate(payment.created_at)">
                    {{ formatDate(payment.created_at) }}
                  </small>
                </div>
                <div class="profile-order-monthly-status">
                  <span :class="monthlyPaymentStatusClass(payment)">
                    {{ monthlyPaymentStatusLabel(payment) }}
                  </span>
                  <small v-if="payment.ican_error_note">
                    {{ payment.ican_error_note }}
                  </small>
                </div>
              </div>
            </div>
          </section>

          <footer class="profile-order-foot">
            <div class="profile-order-money-row">
              <span>{{ getOrderTotalLabel(order) }}</span>
              <strong>{{ formatMoney(getOrderDisplayTotal(order)) }} {{ t("uzs") }}</strong>
            </div>
            <div class="profile-order-money-row">
              <span>{{ t("profile.paidAmount") }}</span>
              <strong class="is-paid">{{ formatMoney(getOrderPaidAmount(order)) }} {{ t("uzs") }}</strong>
            </div>
            <div class="profile-order-money-row">
              <span>{{ t("profile.remainingAmount") }}</span>
              <strong>{{ formatMoney(getOrderRemainingAmount(order)) }} {{ t("uzs") }}</strong>
            </div>
            <button
              v-if="shouldShowMonthlyPaymentButton(order)"
              type="button"
              class="profile-order-pay-btn"
              :disabled="!canPayMonthly(order)"
              @click="startMonthlyPayment(order)"
            >
              {{ getMonthlyPaymentButtonLabel(order) }}
            </button>
            <p v-else-if="shouldShowMonthlyPaymentNotice(order)" class="profile-order-payment-note">
              {{ getMonthlyPaymentNotice(order) }}
            </p>
          </footer>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.profile-orders-page {
  min-height: 70vh;
  background: #f7f8fa;
  padding: 7rem 1rem 4rem;
}

.profile-orders-hero,
.profile-orders-content {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.profile-orders-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.profile-orders-title-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.profile-orders-back {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  min-height: 40px;
  border: 0;
  background: transparent;
  color: #18304f;
  padding: 0;
  font-weight: 900;
}

.profile-orders-back span {
  font-size: 2rem;
  line-height: 1;
}

.profile-orders-hero h1 {
  margin: 0;
  color: #142338;
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 900;
  line-height: 1;
}

.profile-orders-hero p {
  margin-top: 0.6rem;
  max-width: 640px;
  color: #64748b;
  font-weight: 600;
}

.profile-orders-user {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  border-radius: 8px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: #ffffff;
  padding: 0.85rem 1rem;
  color: #142338;
}

.profile-orders-user span {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 700;
}

.profile-orders-state,
.profile-order {
  border-radius: 8px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}

.profile-orders-state {
  display: flex;
  min-height: 260px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-weight: 700;
}

.profile-orders-state h2 {
  color: #142338;
  font-size: 1.4rem;
  font-weight: 900;
}

.profile-orders-state button,
.profile-orders-state.is-error button {
  border-radius: 8px;
  background: #18304f;
  color: #ffffff;
  padding: 0.8rem 1rem;
  font-weight: 800;
}

.profile-orders-state.is-error {
  color: #b91c1c;
}

.profile-orders-list {
  display: grid;
  gap: 1rem;
}

.profile-order {
  overflow: hidden;
}

.profile-order-head,
.profile-order-product {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.profile-order-head,
.profile-order-foot {
  padding: 1rem 1.15rem;
}

.profile-order-foot {
  display: grid;
  gap: 0.55rem;
}

.profile-order-head {
  border-bottom: 1px solid rgba(20, 35, 56, 0.08);
}

.profile-order-head-main,
.profile-order-status,
.profile-order-product-price {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.profile-order-head span,
.profile-order-product-main p,
.profile-order-product-price span,
.profile-order-money-row span,
.profile-order-status small {
  color: #64748b;
  font-size: 0.84rem;
  font-weight: 700;
}

.profile-order-head strong,
.profile-order-money-row strong,
.profile-order-product-price strong {
  color: #142338;
  font-weight: 900;
}

.profile-order-credit-term {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: max-content;
  border-radius: 999px;
  background: #ecfdf3;
  color: #166534;
  margin-top: 0.45rem;
  padding: 0.22rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 900;
}

.profile-order-status {
  align-items: flex-end;
}

.profile-order-created {
  width: max-content;
  border-radius: 999px;
  background: #f1f5f9;
  color: #42546d;
  padding: 0.28rem 0.62rem;
  font-size: 0.78rem;
  font-weight: 900;
}

.profile-order-status span {
  border-radius: 999px;
  background: #eef2f6;
  color: #18304f;
  padding: 0.35rem 0.65rem;
}

.profile-order-status .is-success {
  background: #dcfce7;
  color: #14532d;
}

.profile-order-status .is-warning {
  background: #fef3c7;
  color: #92400e;
}

.profile-order-status .is-error {
  background: #fee2e2;
  color: #991b1b;
}

.profile-order-status .is-muted {
  background: #eef2f6;
  color: #18304f;
}

.profile-order-id-badge {
  border-radius: 999px;
  background: #142338;
  color: #ffffff;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 900;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgba(20, 35, 56, 0.12);
}

.profile-order-products {
  display: grid;
}

.profile-order-monthly {
  border-top: 1px solid rgba(20, 35, 56, 0.08);
  padding: 1rem 1.15rem;
}

.profile-order-credit-state {
  display: grid;
  gap: 0.65rem;
  border-top: 1px solid rgba(20, 35, 56, 0.08);
  padding: 1rem 1.15rem;
  background: #fcfdff;
}

.profile-order-credit-state-head,
.profile-order-credit-state-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.profile-order-credit-state-head {
  flex-wrap: wrap;
}

.profile-order-credit-state-head strong {
  color: #142338;
  font-size: 0.95rem;
  font-weight: 900;
}

.profile-order-credit-state-head small,
.profile-order-credit-state-body small {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
}

.profile-order-credit-state-body {
  align-items: flex-start;
}

.profile-order-credit-state-body span {
  border-radius: 999px;
  padding: 0.3rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 900;
  white-space: nowrap;
}

.profile-order-credit-state .is-success {
  background: #dcfce7;
  color: #14532d;
}

.profile-order-credit-state .is-warning {
  background: #fef3c7;
  color: #92400e;
}

.profile-order-credit-state .is-error {
  background: #fee2e2;
  color: #991b1b;
}

.profile-order-credit-state .is-muted {
  background: #eef2f6;
  color: #18304f;
}

.profile-order-monthly-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.profile-order-monthly-head h3 {
  color: #142338;
  font-size: 0.95rem;
  font-weight: 900;
}

.profile-order-monthly-head span {
  border-radius: 999px;
  background: #eef2f6;
  color: #18304f;
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 900;
}

.profile-order-monthly-list {
  display: grid;
  gap: 0.55rem;
}

.profile-order-monthly-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 8px;
  background: #f8fafc;
  padding: 0.75rem;
}

.profile-order-monthly-row div,
.profile-order-monthly-status {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.profile-order-monthly-row strong {
  color: #142338;
  font-weight: 900;
}

.profile-order-monthly-row small {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
}

.profile-order-monthly-status {
  align-items: flex-end;
  text-align: right;
}

.profile-order-monthly-status span {
  border-radius: 999px;
  padding: 0.28rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 900;
}

.profile-order-monthly-status .is-success {
  background: #dcfce7;
  color: #14532d;
}

.profile-order-monthly-status .is-warning {
  background: #fef3c7;
  color: #92400e;
}

.profile-order-monthly-status .is-error {
  background: #fee2e2;
  color: #991b1b;
}

.profile-order-monthly-status .is-muted {
  background: #eef2f6;
  color: #18304f;
}

.profile-order-product {
  padding: 1rem 1.15rem;
}

.profile-order-product + .profile-order-product {
  border-top: 1px solid rgba(20, 35, 56, 0.08);
}

.profile-order-product-main {
  min-width: 0;
}

.profile-order-product-main h2 {
  color: #142338;
  font-size: 1rem;
  font-weight: 900;
}

.profile-order-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
}

.profile-order-options span {
  border-radius: 999px;
  background: #eef2f6;
  color: #18304f;
  padding: 0.28rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 800;
}

.profile-order-product-price {
  flex-shrink: 0;
  align-items: flex-end;
  text-align: right;
}

.profile-order-foot {
  border-top: 1px solid rgba(20, 35, 56, 0.08);
  background: #f8fafc;
}

.profile-order-money-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.profile-order-money-row strong {
  color: #14532d;
}

.profile-order-money-row .is-paid {
  color: #18304f;
}

.profile-order-pay-btn {
  min-height: 44px;
  border-radius: 8px;
  background: #18304f;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 900;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.profile-order-pay-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.profile-order-pay-btn:not(:disabled):hover {
  background: #142338;
}

.profile-order-payment-note {
  margin: 0;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  padding: 0.75rem 0.85rem;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.45;
}

@media (max-width: 720px) {
  .profile-orders-page {
    padding: 0.75rem 0.75rem 6.5rem;
  }

  .profile-orders-hero {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0.85rem;
  }

  .profile-orders-title-row {
    gap: 0.55rem;
  }

  .profile-orders-back {
    min-height: 34px;
    font-size: 0.9rem;
  }

  .profile-orders-back span {
    font-size: 1.7rem;
  }

  .profile-orders-hero h1 {
    font-size: 1.45rem;
  }

  .profile-orders-hero > div > p {
    display: none;
  }

  .profile-orders-user {
    width: 100%;
    padding: 0.7rem 0.85rem;
  }

  .profile-orders-user span:last-child {
    display: none;
  }

  .profile-orders-list {
    gap: 0.75rem;
  }

  .profile-order-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.75rem;
    padding: 0.85rem;
  }

  .profile-order-head div,
  .profile-order-status {
    min-width: 0;
  }

  .profile-order-head span,
  .profile-order-product-main p,
  .profile-order-product-price span,
  .profile-order-money-row span,
  .profile-order-status small {
    font-size: 0.76rem;
  }

  .profile-order-head strong {
    font-size: 0.92rem;
  }

  .profile-order-status {
    align-items: flex-end;
    text-align: right;
  }

  .profile-order-status span {
    padding: 0.28rem 0.5rem;
    font-size: 0.76rem;
    white-space: nowrap;
  }

  .profile-order-status small {
    display: none;
  }

  .profile-order-id-badge {
    display: inline-flex;
    padding: 0.3rem 0.58rem;
    font-size: 0.72rem;
  }

  .profile-order-product {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 0.75rem;
    padding: 0.85rem;
  }

  .profile-order-product-main h2 {
    display: -webkit-box;
    overflow: hidden;
    font-size: 0.92rem;
    line-height: 1.25;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .profile-order-options {
    display: none;
  }

  .profile-order-product-price {
    align-items: flex-end;
    text-align: right;
  }

  .profile-order-product-price strong {
    font-size: 0.88rem;
    white-space: nowrap;
  }

  .profile-order-monthly {
    padding: 0.75rem 0.85rem;
  }

  .profile-order-credit-state {
    padding: 0.75rem 0.85rem;
  }

  .profile-order-credit-state-head,
  .profile-order-credit-state-body {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-order-monthly-head {
    margin-bottom: 0;
  }

  .profile-order-monthly-list {
    display: none;
  }

  .profile-order-foot {
    padding: 0.85rem;
  }

  .profile-order-money-row {
    align-items: center;
    flex-direction: row;
    gap: 0.75rem;
  }

  .profile-order-pay-btn {
    min-height: 42px;
    font-size: 0.84rem;
  }

  .profile-order-payment-note {
    padding: 0.65rem 0.75rem;
    font-size: 0.8rem;
  }

  .profile-orders-state {
    min-height: 220px;
    padding: 1.25rem;
  }
}

@media (max-width: 420px) {
  .profile-order-head,
  .profile-order-product {
    grid-template-columns: minmax(0, 1fr);
  }

  .profile-order-status,
  .profile-order-product-price {
    width: 100%;
    align-items: flex-start;
    text-align: left;
  }

  .profile-order-product-price strong {
    white-space: normal;
  }
}

@media (max-width: 720px) {
  .profile-orders-page {
    padding-bottom: 6.5rem;
  }

  .profile-order-monthly-status {
    align-items: flex-start;
    text-align: left;
  }
}
</style>
