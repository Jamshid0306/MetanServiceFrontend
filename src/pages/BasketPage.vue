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
      <h1 class="basket-title animate-fade flex items-center gap-3 text-3xl font-bold">
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
          class="basket-card group flex flex-col items-center overflow-hidden rounded-2xl border bg-white transition-all duration-500 sm:flex-row sm:items-stretch"
        >
          <div
            class="basket-media flex-shrink-0 w-full sm:w-40 h-40 flex items-center justify-center cursor-pointer"
            @click="goToProduct(item.id)"
          >
            <img
              :src="normalizeImages(item.images)[0]"
              class="h-28 w-28 object-contain transition-transform duration-300 group-hover:scale-105"
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
            <span class="basket-qty flex items-center overflow-hidden rounded-xl border">
              <button
                @click="basketStore.decreaseQuantity(getItemKey(item))"
                class="basket-qty-btn flex h-10 w-10 cursor-pointer items-center justify-center text-lg font-bold text-slate-700 transition-all duration-300"
              >
                –
              </button>

              <input
                type="text"
                v-model="item.quantity"
                class="basket-qty-input w-14 text-center font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-slate-300"
                @input="item.quantity = String(item.quantity).replace(/[^0-9]/g, '')"
                @blur="
                  if (!item.quantity || parseInt(item.quantity) < 1)
                    item.quantity = 1;
                "
                @change="basketStore.updateQuantity(getItemKey(item), parseInt(item.quantity))"
              />

              <button
                @click="basketStore.updateQuantity(getItemKey(item), Number(item.quantity || 0) + 1)"
                class="basket-qty-btn flex h-10 w-10 cursor-pointer items-center justify-center text-lg font-bold text-slate-700 transition-all duration-300"
              >
                +
              </button>
            </span>

            <span class="basket-item-price min-w-[140px] text-right text-xl font-bold">
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
              class="basket-remove cursor-pointer rounded-xl p-2 transition-all duration-300"
            >
              <Trash2 class="h-5 w-5 text-slate-700" />
            </button>
          </div>
        </div>
      </transition-group>

      <div v-else class="basket-empty text-center py-28 text-gray-400 animate-fade">
        <p class="text-xl mb-4">{{ t("empty") }}</p>
        <button
          @click="router.push('/products')"
          class="basket-empty-btn rounded-xl px-6 py-3 text-white transition-all duration-300"
        >
          {{ t("seeProducts") }}
        </button>
      </div>

      <div
        class="basket-summary-grid mt-10 animate-fade"
        v-if="basketStore.basket.length"
      >
        <div class="basket-total-row flex justify-between items-center gap-6">
          <p class="basket-total text-2xl font-bold">
            {{ t("allBasket") }}: {{ formatPrice(totalPrice) }}
          </p>
          <button
            @click="basketStore.clearBasket()"
            class="basket-clear rounded-xl px-6 py-3 text-white transition-all duration-300"
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
  background: transparent;
}

.basket-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(20, 35, 56, 0.12);
  border-radius: 12px;
  background: #ffffff;
  color: #18304f;
  padding: 2px;
}

.basket-title {
  color: #142338;
}

.basket-card {
  border: 1px solid rgba(20, 35, 56, 0.1);
}

.basket-card:hover {
  border-color: rgba(20, 35, 56, 0.18);
}

.basket-media {
  background: #f3f5f7;
}

.basket-divider {
  background: rgba(20, 35, 56, 0.12);
}

.basket-name {
  color: #1b2d44;
}

.basket-configurator {
  padding: 1rem;
  border-radius: 18px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #f6f7f9;
}

.basket-configurator-title {
  color: #142338;
  font-size: 0.9rem;
  font-weight: 800;
}

.basket-option-group + .basket-option-group {
  margin-top: 0.9rem;
}

.basket-option-group-title {
  margin-top: 0.7rem;
  margin-bottom: 0.45rem;
  color: #64748b;
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
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #ffffff;
  color: #41536f;
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
  border-color: rgba(20, 35, 56, 0.18);
}

.basket-option-chip-active {
  border-color: rgba(20, 35, 56, 0.18);
  background: #edf2f6;
  color: #142338;
}

.basket-option-delta {
  font-size: 0.72rem;
  opacity: 0.9;
}

.basket-controls {
  border-color: rgba(20, 35, 56, 0.08);
}

.basket-qty {
  border-color: rgba(20, 35, 56, 0.12);
}

.basket-qty-btn {
  background: #f1f4f7;
}

.basket-qty-btn:hover {
  background: #e8edf2;
}

.basket-qty-input {
  color: #22334b;
}

.basket-item-price {
  color: #142338;
}

.basket-remove {
  background: #f1f4f7;
}

.basket-remove:hover {
  background: #e8edf2;
}

.basket-empty {
  color: #6e7f9c;
}

.basket-empty-btn {
  background: #18304f;
}

.basket-empty-btn:hover {
  background: #142338;
}

.basket-total {
  color: #142338;
}

.basket-clear {
  background: #18304f;
}

.basket-clear:hover {
  background: #142338;
}

.basket-summary-grid {
  display: grid;
  gap: 1rem;
}

.basket-checkout-card {
  padding: 1.2rem;
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(8px);
}

.basket-checkout-title {
  color: #142338;
  font-size: 1.2rem;
  font-weight: 800;
}

.basket-checkout-subtitle {
  margin-top: 0.3rem;
  color: #64748b;
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
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: #ffffff;
  color: #22334b;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.basket-field:focus {
  border-color: rgba(20, 35, 56, 0.2);
  box-shadow: 0 0 0 4px rgba(20, 35, 56, 0.06);
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
  background: #18304f;
  color: #ffffff;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.basket-submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  background: #142338;
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
