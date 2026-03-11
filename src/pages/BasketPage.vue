<script setup>
import { computed, ref } from "vue";
import { useBasketStore } from "../store/basketStore";
import { ShoppingCart, Trash2 } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import Notification from "@/components/Notification.vue";
import LeftArrow from "@/components/icons/LeftArrow.vue";
import { apiClient, getApiErrorMessage, resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import {
  buildConfiguredBasketItem,
  ensureValidOptionSelections,
  formatPriceValue,
  getBasketPrice,
  getProductOptionGroups,
  hasConfigurableOptions,
  parseNumericPrice,
} from "@/lib/productOptions";

const { t, locale } = useI18n();
const basketStore = useBasketStore();
const router = useRouter();
const checkoutForm = ref({
  name: "",
  phone: "",
});
const checkoutLoading = ref(false);
const checkoutError = ref("");
const notification = ref({ show: false, message: "" });

const normalizeImages = (images) => {
  if (!images) return [];
  if (Array.isArray(images)) {
    return resolveAssetUrls(images);
  }
  const resolved = resolveAssetUrl(images);
  return resolved ? [resolved] : [];
};

const extractNumericOrText = (price) => {
  if (!price) return "Narx yo‘q";
  const numeric = parseInt(price.toString().replace(/[^\d]/g, ""), 10);
  return Number.isNaN(numeric) ? price : numeric;
};

const getItemKey = (item) => item.basket_key || `${item.id}:base`;
const getItemSelectionMap = (item) =>
  Array.isArray(item.selected_options)
    ? item.selected_options.reduce((acc, option) => {
        if (option?.group_key && option?.id) {
          acc[option.group_key] = option.id;
        }
        return acc;
      }, {})
    : {};

const getItemOptionGroups = (item) =>
  getProductOptionGroups(item, getItemSelectionMap(item));

const updateItemOption = (item, groupKey, optionId) => {
  const nextSelections = ensureValidOptionSelections(item, {
    ...getItemSelectionMap(item),
    [groupKey]: optionId,
  });

  basketStore.replaceBasketItem(
    getItemKey(item),
    buildConfiguredBasketItem(item, nextSelections, item.quantity)
  );
};

const totalPrice = computed(() => {
  let sum = 0;
  let hasText = false;

  basketStore.basket.forEach((p) => {
    const val = extractNumericOrText(getBasketPrice(p, locale.value));
    if (typeof val === "number") {
      sum += val * p.quantity;
    } else {
      hasText = true;
    }
  });

  if (hasText && sum === 0) {
    return "Narxni so’rang";
  }
  return sum;
});

const numericTotal = computed(() =>
  basketStore.basket.reduce((sum, item) => {
    const price = parseNumericPrice(getBasketPrice(item, locale.value));
    if (price === null) {
      return sum;
    }
    return sum + price * item.quantity;
  }, 0)
);

const formatPrice = (price) => formatPriceValue(price);

const removeItem = (item) => basketStore.removeFromBasket(getItemKey(item));
const goToProduct = (id) =>
  router.push({ name: "ProductDetail", params: { id } });

const submitOrder = async () => {
  const name = checkoutForm.value.name.trim();
  const phone = checkoutForm.value.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");

  if (!name || !phone || phoneDigits.length < 9 || !basketStore.basket.length) {
    checkoutError.value = t("please_fill_all_fields");
    return;
  }

  checkoutLoading.value = true;
  checkoutError.value = "";

  try {
    await apiClient.post("/products/order", {
      name,
      phone,
      locale: locale.value,
      total: numericTotal.value,
      products: basketStore.basket.map((item) => ({
        id: item.id,
        name: item[`name_${locale.value}`],
        quantity: item.quantity,
        price: getBasketPrice(item, locale.value),
        selected_options: item.selected_options || [],
      })),
    });

    basketStore.clearBasket();
    checkoutForm.value = { name: "", phone: "" };
    notification.value = {
      show: true,
      message: t("success"),
    };
  } catch (error) {
    checkoutError.value = getApiErrorMessage(error, t("send"));
  } finally {
    checkoutLoading.value = false;
  }
};
</script>

<template>
  <div class="basket-page max-w-6xl mx-auto py-12 px-4 mt-[30px]">
    <Notification
      :message="notification.message"
      :show="notification.show"
      @close="notification.show = false"
    />
    <div class="basket-header flex my-4 items-center gap-12">
      <RouterLink class="basket-back hover:scale-105" to="/">
        <LeftArrow :size="30" />
      </RouterLink>
      <h1 class="basket-title text-3xl font-bold text-blue-800 flex items-center gap-3 animate-fade">
        <ShoppingCart class="w-6 h-6" /> {{ t("basket") }}
      </h1>
    </div>

    <div class="min-h-[50vh]">
      <transition-group
        name="list"
        tag="div"
        v-if="basketStore.basket.length"
        class="grid gap-6"
      >
        <div
          v-for="item in basketStore.basket"
          :key="getItemKey(item)"
          class="basket-card bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-all duration-500 overflow-hidden flex flex-col sm:flex-row items-center sm:items-stretch group"
        >
          <div
            class="basket-media flex-shrink-0 w-full sm:w-40 h-40 flex items-center justify-center cursor-pointer"
            @click="goToProduct(item.id)"
          >
            <img
              :src="normalizeImages(item.images)[0]"
              class="w-28 h-28 object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <hr class="basket-divider h-full w-[1px] bg-gray-300" />
          <div
            class="basket-info flex flex-col justify-center flex-1 px-5 py-4 cursor-pointer"
            @click="goToProduct(item.id)"
          >
            <h2 class="basket-name font-semibold text-lg mb-1">{{ item[`name_${locale}`] }}</h2>
            <div
              v-if="item.selected_options?.length"
              class="mt-2 flex flex-wrap gap-2"
            >
              <span
                v-for="option in item.selected_options"
                :key="`${getItemKey(item)}-${option.group_key}`"
                class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {{ t(option.title_key) }}: {{ option.label }}
              </span>
            </div>

            <div
              v-if="hasConfigurableOptions(item) && getItemOptionGroups(item).length"
              class="basket-configurator mt-4"
              @click.stop
            >
              <p class="basket-configurator-title">
                {{ t("basket_options_title") }}
              </p>

              <div
                v-for="group in getItemOptionGroups(item)"
                :key="`${getItemKey(item)}-${group.key}`"
                class="basket-option-group"
              >
                <p class="basket-option-group-title">
                  {{ t(group.titleKey) }}
                </p>
                <div class="basket-option-list">
                  <button
                    v-for="option in group.options"
                    :key="option.id"
                    type="button"
                    class="basket-option-chip"
                    :class="{
                      'basket-option-chip-active':
                        getItemSelectionMap(item)[group.key] === option.id,
                    }"
                    @click.stop="updateItemOption(item, group.key, option.id)"
                  >
                    <span>{{ option.label }}</span>
                    <span
                      v-if="group.key === 'cylinder_volume' && option.price_delta"
                      class="basket-option-delta"
                    >
                      {{ formatPrice(option.price_delta) }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            class="basket-controls flex items-center justify-end gap-6 px-5 py-4 border-t sm:border-t-0 sm:border-l border-gray-100"
          >
            <span class="basket-qty flex items-center border rounded-xl overflow-hidden shadow-sm">
              <button
                @click="basketStore.decreaseQuantity(getItemKey(item))"
                class="basket-qty-btn w-10 h-10 flex items-center justify-center text-lg font-bold text-blue-700 bg-blue-50 hover:bg-blue-200 cursor-pointer transition-all duration-300"
              >
                –
              </button>

              <input
                type="text"
                v-model="item.quantity"
                class="basket-qty-input w-14 text-center font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-400"
                @input="item.quantity = String(item.quantity).replace(/[^0-9]/g, '')"
                @blur="
                  if (!item.quantity || parseInt(item.quantity) < 1)
                    item.quantity = 1;
                "
                @change="basketStore.updateQuantity(getItemKey(item), parseInt(item.quantity))"
              />

              <button
                @click="basketStore.updateQuantity(getItemKey(item), Number(item.quantity || 0) + 1)"
                class="basket-qty-btn w-10 h-10 flex items-center justify-center text-lg font-bold text-blue-700 bg-blue-50 hover:bg-blue-200 cursor-pointer transition-all duration-300"
              >
                +
              </button>
            </span>

            <span class="basket-item-price text-xl font-bold text-blue-800 min-w-[140px] text-right">
              {{
                typeof extractNumericOrText(getBasketPrice(item, locale)) === "number"
                  ? formatPrice(
                      extractNumericOrText(getBasketPrice(item, locale)) * item.quantity
                    )
                  : extractNumericOrText(getBasketPrice(item, locale))
              }}
            </span>

            <button
              @click="removeItem(item)"
              class="basket-remove p-2 bg-blue-50 rounded-xl hover:bg-blue-200 cursor-pointer transition-all duration-300"
            >
              <Trash2 class="w-5 h-5 text-blue-700" />
            </button>
          </div>
        </div>
      </transition-group>

      <div v-else class="basket-empty text-center py-28 text-gray-400 animate-fade">
        <p class="text-xl mb-4">{{ t("empty") }}</p>
        <button
          @click="router.push('/products')"
          class="basket-empty-btn bg-blue-700 text-white py-3 px-6 rounded-xl hover:bg-blue-800 transition-all duration-300"
        >
          {{ t("seeProducts") }}
        </button>
      </div>

      <div
        class="basket-summary-grid mt-10 animate-fade"
        v-if="basketStore.basket.length"
      >
        <div class="basket-total-row flex justify-between items-center gap-6">
          <p class="basket-total text-2xl font-bold text-blue-800">
            {{ t("allBasket") }}: {{ formatPrice(totalPrice) }}
          </p>
          <button
            @click="basketStore.clearBasket()"
            class="basket-clear bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-6 rounded-xl shadow-lg hover:from-blue-700 hover:to-blue-900 transition-all duration-300"
          >
            {{ t("clear") }}
          </button>
        </div>

        <div class="basket-checkout-card">
          <div class="basket-checkout-copy">
            <h2 class="basket-checkout-title">{{ t("checkout") }}</h2>
            <p class="basket-checkout-subtitle">{{ t("checkout_subtitle") }}</p>
          </div>

          <div class="basket-checkout-form">
            <input
              v-model="checkoutForm.name"
              type="text"
              :placeholder="t('name')"
              class="basket-field"
            />
            <input
              v-model="checkoutForm.phone"
              type="tel"
              placeholder="+998"
              class="basket-field"
            />
          </div>

          <p v-if="checkoutError" class="basket-error">{{ checkoutError }}</p>

          <button
            @click="submitOrder"
            :disabled="checkoutLoading"
            class="basket-submit-btn"
          >
            {{ checkoutLoading ? t("sending") : t("checkout") }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basket-page {
  background:
    radial-gradient(circle at 0% 0%, rgba(24, 79, 149, 0.08), transparent 32%),
    radial-gradient(circle at 100% 100%, rgba(15, 43, 102, 0.06), transparent 34%);
}

.basket-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(20, 54, 108, 0.18);
  border-radius: 12px;
  background: #ffffff;
  color: #1a447f;
  padding: 2px;
}

.basket-title {
  color: #14325f;
}

.basket-card {
  border: 1px solid rgba(20, 54, 108, 0.14);
  box-shadow: 0 12px 20px rgba(8, 30, 72, 0.08);
}

.basket-card:hover {
  box-shadow: 0 18px 28px rgba(8, 30, 72, 0.14);
}

.basket-media {
  background: linear-gradient(180deg, #fbfdff, #f2f7ff);
}

.basket-divider {
  background: rgba(20, 54, 108, 0.16);
}

.basket-name {
  color: #183a6a;
}

.basket-configurator {
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid rgba(20, 54, 108, 0.1);
  background: #f8fbff;
}

.basket-configurator-title {
  color: #173861;
  font-size: 0.9rem;
  font-weight: 800;
}

.basket-option-group + .basket-option-group {
  margin-top: 0.9rem;
}

.basket-option-group-title {
  margin-top: 0.7rem;
  margin-bottom: 0.45rem;
  color: #5e7597;
  font-size: 0.8rem;
  font-weight: 700;
}

.basket-option-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.basket-option-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 38px;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: #ffffff;
  color: #31527f;
  font-size: 0.78rem;
  font-weight: 700;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
}

.basket-option-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(20, 54, 108, 0.24);
}

.basket-option-chip-active {
  border-color: transparent;
  background: #143d7a;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(8, 30, 72, 0.18);
}

.basket-option-delta {
  font-size: 0.72rem;
  opacity: 0.9;
}

.basket-controls {
  border-color: rgba(20, 54, 108, 0.12);
}

.basket-qty {
  border-color: rgba(20, 54, 108, 0.18);
}

.basket-qty-btn {
  background: #edf3ff;
}

.basket-qty-btn:hover {
  background: #dae8ff;
}

.basket-qty-input {
  color: #253a5a;
}

.basket-item-price {
  color: #123660;
}

.basket-remove {
  background: #edf3ff;
}

.basket-remove:hover {
  background: #dae8ff;
}

.basket-empty {
  color: #6e7f9c;
}

.basket-empty-btn {
  background: #143d7a;
}

.basket-empty-btn:hover {
  background: #0f2f61;
}

.basket-total {
  color: #14325f;
}

.basket-clear {
  background: #143d7a;
  box-shadow: 0 12px 20px rgba(8, 30, 72, 0.2);
}

.basket-clear:hover {
  background: #0f2f61;
}

.basket-summary-grid {
  display: grid;
  gap: 1rem;
}

.basket-checkout-card {
  padding: 1.2rem;
  border-radius: 20px;
  border: 1px solid rgba(20, 54, 108, 0.14);
  background: linear-gradient(180deg, #ffffff, #f6faff);
  box-shadow: 0 14px 24px rgba(8, 30, 72, 0.08);
}

.basket-checkout-title {
  color: #14325f;
  font-size: 1.2rem;
  font-weight: 800;
}

.basket-checkout-subtitle {
  margin-top: 0.3rem;
  color: #60789a;
}

.basket-checkout-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.basket-field {
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 0.95rem;
  border-radius: 14px;
  border: 1px solid rgba(20, 54, 108, 0.14);
  background: #ffffff;
  color: #1d355d;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.basket-field:focus {
  border-color: rgba(20, 79, 149, 0.36);
  box-shadow: 0 0 0 4px rgba(26, 79, 149, 0.08);
}

.basket-error {
  margin-top: 0.8rem;
  color: #c53e3e;
  font-weight: 600;
}

.basket-submit-btn {
  margin-top: 1rem;
  min-height: 50px;
  width: 100%;
  border-radius: 14px;
  background: linear-gradient(135deg, #143d7a, #1a4f95);
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 12px 20px rgba(8, 30, 72, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.basket-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 24px rgba(8, 30, 72, 0.22);
}

.basket-submit-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.45s cubic-bezier(0.25, 1, 0.5, 1);
}
.list-enter-from {
  opacity: 0;
  transform: translateY(25px) scale(0.95);
}
.list-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.list-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.list-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.list-move {
  transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
}

@media (max-width: 640px) {
  .basket-header {
    gap: 0.8rem;
  }

  .basket-title {
    font-size: 1.5rem;
  }

  .basket-controls {
    width: 100%;
    justify-content: space-between;
    gap: 0.8rem;
  }

  .basket-item-price {
    min-width: auto;
    font-size: 1rem;
  }

  .basket-total-row {
    flex-direction: column;
    align-items: stretch;
  }

  .basket-checkout-form {
    grid-template-columns: 1fr;
  }
}
</style>
