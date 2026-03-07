<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useAdminStore } from "../../store/adminStore";
import { Motion, AnimatePresence } from "motion-v";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import Notification from "@/components/Notification.vue";
import Delete from "../../components/icons/Delete.vue";
import Pencil from "../../components/icons/Pencil.vue";

import { useLoaderStore } from "@/store/loaderStore";
import { resolveAssetUrl, resolveAssetUrls } from "@/lib/api";
import {
  PRODUCT_OPTION_GROUPS,
  createEmptyOptionItem,
  createEmptyProductOptions,
  formatPriceValue,
  getProductOptionGroups,
  normalizeProductOptions,
  serializeProductOptions,
} from "@/lib/productOptions";

const priceType = ref("show");
const store = useAdminStore();
const showModal = ref(false);
const showDeleteModal = ref(false);
const loading = ref(false);
const currentLang = ref("uz");
const isUpdate = ref(false);
const currentProductId = ref(null);
const notifShow = ref(false);
const notifMessage = ref("");
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 6;

const adminOptionGroups = PRODUCT_OPTION_GROUPS.map((group) => {
  if (group.key === "transmission") {
    return {
      ...group,
      title: "КПП",
      hint: "Добавьте только доступные варианты: автомат, механика и т.д.",
      choices: ["Avtomat", "Mexanika"],
    };
  }

  if (group.key === "cylinder_volume") {
    return {
      ...group,
      title: "Объем баллона",
      hint: "Например: 75, 85, 90, 95.",
      choices: ["50 l", "55 l", "60 l", "65 l", "70 l", "75 l", "80 l", "85 l", "90 l", "95 l", "100 l"],
    };
  }

  return {
    ...group,
    title: "Позиция баллона",
    hint: "Например: 2, 3, 4.",
    choices: ["1", "2", "3", "4", "5"],
  };
});

const createInitialProduct = () => ({
  price: "",
  credit_enabled: false,
  credit_6m_percent: "",
  name: { uz: "", ru: "", en: "" },
  description: { uz: "", ru: "", en: "" },
  characteristic: { uz: "", ru: "", en: "" },
  images: [],
  oldImages: [],
  options: createEmptyProductOptions(),
});
const newProduct = ref(createInitialProduct());

const imagePreviews = ref([]);

const showNotification = (msg) => {
  notifMessage.value = msg;
  notifShow.value = true;
};

const handleFileChange = (e) => {
  const files = Array.from(e.target.files);
  newProduct.value.images.push(...files);
  imagePreviews.value.push(...files.map((f) => URL.createObjectURL(f)));
};

const removeImage = (i) => {
  if (i < newProduct.value.oldImages.length) {
    newProduct.value.oldImages.splice(i, 1);
  } else {
    const idx = i - newProduct.value.oldImages.length;
    newProduct.value.images.splice(idx, 1);
  }
  imagePreviews.value = [
    ...newProduct.value.oldImages.map(resolveAssetUrl).filter(Boolean),
    ...newProduct.value.images.map((f) => URL.createObjectURL(f)),
  ];
};

const changeLanguage = (lang) => {
  currentLang.value = lang;
};

const formatNumericInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const mapOptionsForForm = (rawOptions) => {
  const normalized = normalizeProductOptions(rawOptions);

  return adminOptionGroups.reduce((acc, group) => {
    acc[group.key] = normalized[group.key].map((option) => ({
      id: option.id,
      label: option.label,
      price_delta: option.price_delta ? formatNumericInput(option.price_delta) : "",
    }));
    return acc;
  }, createEmptyProductOptions());
};

const openUpdateModal = (product) => {
  isUpdate.value = true;
  currentProductId.value = product.id;

  // oldImages va imagePreviews
  const oldImages = product.images
    ? Array.isArray(product.images)
      ? product.images
      : product.images.split(",")
    : [];

  imagePreviews.value = oldImages.map(resolveAssetUrl).filter(Boolean);

  // Price type aniqlash
  if (
    product.price_uz === "Narxni so’rang" ||
    product.price_ru === "Цену уточняйте" ||
    product.price_en === "Request price"
  ) {
    priceType.value = "request";
    newProduct.value.price = "";
  } else {
    priceType.value = "show";
    // Eski price’ni set qilamiz
    newProduct.value.price = product.price_uz || "";
  }

  newProduct.value = {
    price_uz: product.price_uz || "",
    price_ru: product.price_ru || "",
    price_en: product.price_en || "",
    price: priceType.value === "show" ? product.price_uz || "" : "",
    credit_enabled: Boolean(product.credit_enabled),
    credit_6m_percent:
      product.credit_6m_percent === null || product.credit_6m_percent === undefined
        ? ""
        : formatNumericInput(product.credit_6m_percent),
    name: {
      uz: product.name_uz || "",
      ru: product.name_ru || "",
      en: product.name_en || "",
    },
    description: {
      uz: product.description_uz || "",
      ru: product.description_ru || "",
      en: product.description_en || "",
    },
    characteristic: {
      uz: product.characteristic_uz || "",
      ru: product.characteristic_ru || "",
      en: product.characteristic_en || "",
    },
    images: [],
    oldImages: oldImages,
    options: mapOptionsForForm(product.config_options),
  };

  showModal.value = true;
};

const resetForm = () => {
  newProduct.value = createInitialProduct();
  imagePreviews.value = [];
  loading.value = false;
  isUpdate.value = false;
  currentProductId.value = null;
  currentLang.value = "uz";
  priceType.value = "show";
};

const addOptionRow = (groupKey) => {
  newProduct.value.options[groupKey].push(createEmptyOptionItem());
};

const removeOptionRow = (groupKey, index) => {
  newProduct.value.options[groupKey].splice(index, 1);
};

const getGroupChoices = (groupKey, currentValue = "") => {
  const group = adminOptionGroups.find((item) => item.key === groupKey);
  const choices = Array.isArray(group?.choices) ? [...group.choices] : [];

  if (currentValue && !choices.includes(currentValue)) {
    choices.unshift(currentValue);
  }

  return choices;
};

const isGroupChoiceDisabled = (groupKey, choice, currentIndex) =>
  newProduct.value.options[groupKey].some(
    (option, index) => index !== currentIndex && option.label === choice
  );

const onOptionPriceInput = (event, groupKey, index) => {
  newProduct.value.options[groupKey][index].price_delta = formatNumericInput(
    event.target.value
  );
};

const onCreditPercentInput = (event) => {
  newProduct.value.credit_6m_percent = formatNumericInput(event.target.value);
};

const addOrUpdateProduct = async () => {
  loading.value = true;
  const formData = new FormData();

  formData.append("name_uz", newProduct.value.name.uz || "");
  formData.append("name_ru", newProduct.value.name.ru || "");
  formData.append("name_en", newProduct.value.name.en || "");

  formData.append("description_uz", newProduct.value.description?.uz || "");
  formData.append("description_ru", newProduct.value.description?.ru || "");
  formData.append("description_en", newProduct.value.description?.en || "");

  formData.append(
    "characteristic_uz",
    newProduct.value.characteristic?.uz || ""
  );
  formData.append(
    "characteristic_ru",
    newProduct.value.characteristic?.ru || ""
  );
  formData.append(
    "characteristic_en",
    newProduct.value.characteristic?.en || ""
  );

  if (priceType.value === "show") {
    formData.append("price_uz", newProduct.value.price || "");
    formData.append("price_ru", newProduct.value.price || "");
    formData.append("price_en", newProduct.value.price || "");
  } else {
    formData.append("price_uz", "Narxni so’rang");
    formData.append("price_ru", "Цену уточняйте");
    formData.append("price_en", "Request price");
  }

  formData.append("credit_enabled", String(Boolean(newProduct.value.credit_enabled)));
  formData.append(
    "credit_6m_percent",
    newProduct.value.credit_enabled ? newProduct.value.credit_6m_percent || "" : ""
  );

  formData.append(
    "config_options",
    JSON.stringify(serializeProductOptions(newProduct.value.options))
  );

  newProduct.value.images.forEach((file) => {
    formData.append("files", file);
  });
  newProduct.value.oldImages.forEach((img) => {
    formData.append("oldImages", img);
  });

  try {
    if (isUpdate.value) {
      await store.updateProduct(currentProductId.value, formData);
      showNotification("Товар успешно обновлён!");
    } else {
      await store.createProduct(formData);
      showNotification("Товар успешно добавлен!");
    }
    showModal.value = false;
    resetForm();
  } catch (err) {
    console.error("Product add/update failed:", err);
  } finally {
    loading.value = false;
  }
};

const deleteProduct = async () => {
  await store.deleteProduct(currentProductId.value);
  showDeleteModal.value = false;
  showModal.value = false;
  resetForm();
  store.getProducts();
  showNotification("Товар успешно удалён!");
};

onMounted(async () => {
  useLoaderStore().loader = true;
  await store.getProducts();
});

watch(priceType, (val) => {
  if (val === "show") {
    newProduct.value.price =
      newProduct.value.price_uz &&
      newProduct.value.price_uz !== "Narxni so’rang"
        ? newProduct.value.price_uz
        : "";
  } else {
    // Agar request bo‘lsa, input bo‘sh bo‘lsin
    newProduct.value.price = "";
  }
});
watch(
  () => newProduct.value.credit_enabled,
  (enabled) => {
    if (!enabled) {
      newProduct.value.credit_6m_percent = "";
    }
  }
);
const normalizeImages = (images) => resolveAssetUrls(images);

const productsList = computed(() =>
  Array.isArray(store.products) ? store.products : []
);
const formatPrice = (value) => formatPriceValue(value);

const onPriceInput = (e) => {
  const el = e.target;
  let start = el.selectionStart;
  let end = el.selectionEnd;

  const digits = el.value.replace(/\D/g, "");
  const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  newProduct.value.price = formatted;

  const diff = formatted.length - digits.length;
  el.setSelectionRange(start + diff, end + diff);
};

const filteredProducts = computed(() => {
  const products = productsList.value;
  if (!searchQuery.value) return products;
  const q = searchQuery.value.toLowerCase();
  return products.filter((p) => {
    const nameRu = String(p.name_ru || "").toLowerCase();
    const nameUz = String(p.name_uz || "").toLowerCase();
    const nameEn = String(p.name_en || "").toLowerCase();
    return nameRu.includes(q) || nameUz.includes(q) || nameEn.includes(q);
  });
});
const totalPages = computed(() => {
  const total = Math.ceil(filteredProducts.value.length / itemsPerPage);
  return Number.isFinite(total) && total > 0 ? total : 1;
});
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredProducts.value.slice(start, end);
});

watch(filteredProducts, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
});

watch(searchQuery, () => {
  currentPage.value = 1;
});

const goToPage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
};

const getProductOptionBadges = (product) =>
  getProductOptionGroups(product).map((group) => ({
    key: group.key,
    title: adminOptionGroups.find((item) => item.key === group.key)?.title || group.key,
    count: group.options.length,
  }));

const hasCreditBadge = (product) =>
  Boolean(product.credit_enabled) &&
  product.credit_6m_percent !== null &&
  product.credit_6m_percent !== undefined &&
  String(product.credit_6m_percent) !== "";
</script>
<template>
  <div class="products-admin p-4 sm:p-6 space-y-6">
    <Notification :message="notifMessage" :show="notifShow" type="success" />
    <div class="products-toolbar">
      <div class="products-toolbar-copy">
        <div>
          <p class="products-eyebrow">Каталог</p>
          <h2 class="products-title">Управление товарами</h2>
          <p class="products-subtitle">
            Настраивайте карточки, изображения и комплектации в одном месте.
          </p>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск продукта..."
          class="products-search"
        />
      </div>

      <button
        @click="
          showModal = true;
          resetForm();
        "
        class="products-create-btn"
      >
        Добавить продукт
      </button>
    </div>
    <div class="space-y-6">
      <AnimatePresence>
        <Motion
          v-for="(product, i) in paginatedProducts"
          :key="product.id"
          class="product-row relative group"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: -20 }"
          :transition="{ duration: 0.25, delay: 0.05 }"
        >
          <button
            @click.stop="openUpdateModal(product)"
            class="product-edit-btn"
          >
            <Pencil :size="20" />
          </button>
          <div class="product-gallery">
            <Swiper
              :modules="[Navigation, Pagination]"
              pagination
              class="product-swiper"
            >
              <SwiperSlide
                v-for="(img, index) in normalizeImages(product.images)"
                :key="index"
              >
                <img :src="img" class="product-gallery-image" alt="Image" />
              </SwiperSlide>
            </Swiper>
          </div>
          <div class="product-copy">
            <div class="product-meta-row">
              <span class="product-id-chip">#{{ product.id }}</span>
            </div>
            <div class="product-title">
              {{ product.name_ru }}
            </div>
            <div class="product-description">
              {{ product.description_ru }}
            </div>
            <div
              v-if="getProductOptionBadges(product).length || hasCreditBadge(product)"
              class="product-badges"
            >
              <span
                v-for="badge in getProductOptionBadges(product)"
                :key="badge.key"
                class="product-badge"
              >
                {{ badge.title }}: {{ badge.count }}
              </span>
              <span
                v-if="hasCreditBadge(product)"
                class="product-badge product-badge-credit"
              >
                Кредит: {{ product.credit_6m_percent }}%
              </span>
            </div>
          </div>
          <div class="product-price-box">
            <span class="product-price-label">Базовая цена</span>
            <div class="product-price-value">
              {{ formatPrice(product.price_ru) }}
            </div>
          </div>
        </Motion>
      </AnimatePresence>
      <div class="product-pagination">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="product-page-btn"
        >
          &lt;
        </button>
        <button
          v-for="page in totalPages"
          :key="page"
          @click="goToPage(page)"
          :class="{
            'product-page-btn-active': currentPage === page,
          }"
          class="product-page-btn"
        >
          {{ page }}
        </button>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="product-page-btn"
        >
          &gt;
        </button>
      </div>
    </div>

    <AnimatePresence>
      <Motion
        v-if="showModal"
        class="editor-overlay fixed inset-0 z-50 flex items-center justify-center"
      >
        <Motion
          class="editor-modal"
        >
          <div class="editor-header">
            <div>
              <p class="editor-eyebrow">
                {{ isUpdate ? "Редактирование" : "Новый товар" }}
              </p>
              <h2 class="editor-title">
                {{ isUpdate ? "Обновить продукт" : "Добавить продукт" }}
              </h2>
            </div>
            <button
              v-if="isUpdate"
              @click="showDeleteModal = true"
              class="editor-delete-btn"
            >
              <Delete :size="26" />
            </button>
          </div>

          <div class="editor-layout">
            <div class="editor-panel editor-panel-accent">
              <div class="space-y-2">
                <label class="editor-label">Отображение цены</label>
              <select
                v-model="priceType"
                class="editor-field"
              >
                <option value="show">Показать цену</option>
                <option value="request">Не показывать цену</option>
              </select>

              <input
                v-if="priceType === 'show'"
                v-model="newProduct.price"
                @input="onPriceInput"
                placeholder="0 UZS"
                class="editor-field"
              />
            </div>

            <div class="editor-section space-y-4">
              <div class="editor-section-head">
                <div>
                  <h3 class="editor-section-title">Кредит</h3>
                  <p class="editor-section-copy">
                    Укажите ставку для 6 месяцев. Пользователь увидит расчёт на 3, 6, 9 и 12 месяцев.
                  </p>
                </div>
              </div>

              <div class="credit-toggle">
                <button
                  type="button"
                  class="credit-toggle-btn"
                  :class="{ 'credit-toggle-btn-active': newProduct.credit_enabled }"
                  @click="newProduct.credit_enabled = true"
                >
                  Доступен
                </button>
                <button
                  type="button"
                  class="credit-toggle-btn"
                  :class="{ 'credit-toggle-btn-active': !newProduct.credit_enabled }"
                  @click="newProduct.credit_enabled = false"
                >
                  Выключен
                </button>
              </div>

              <input
                v-if="newProduct.credit_enabled"
                :value="newProduct.credit_6m_percent"
                @input="onCreditPercentInput"
                placeholder="6 oy uchun foiz, masalan 24"
                class="editor-field"
              />
            </div>

            <div class="editor-section space-y-4">
              <div class="editor-section-head">
                <div>
                  <h3 class="editor-section-title">
                    Варианты и доплата
                  </h3>
                  <p class="editor-section-copy">
                    Добавьте только доступные категории для этого товара. Пользователь
                    увидит только эти варианты, а цена посчитается автоматически.
                  </p>
                </div>
              </div>

              <div
                v-for="group in adminOptionGroups"
                :key="group.key"
                class="editor-option-group"
              >
                <div class="editor-option-head">
                  <div>
                    <h4 class="editor-option-title">{{ group.title }}</h4>
                    <p class="editor-option-copy">{{ group.hint }}</p>
                  </div>
                  <button
                    type="button"
                    @click="addOptionRow(group.key)"
                    class="editor-secondary-btn"
                  >
                    Добавить
                  </button>
                </div>

                <div
                  v-if="!newProduct.options[group.key].length"
                  class="editor-empty-state"
                >
                  Варианты ещё не добавлены.
                </div>

                <div
                  v-for="(option, index) in newProduct.options[group.key]"
                  :key="option.id"
                  class="editor-option-row"
                >
                  <select
                    v-model="option.label"
                    class="editor-field editor-select"
                  >
                    <option value="" disabled>Выберите вариант</option>
                    <option
                      v-for="choice in getGroupChoices(group.key, option.label)"
                      :key="choice"
                      :value="choice"
                      :disabled="isGroupChoiceDisabled(group.key, choice, index)"
                    >
                      {{ choice }}
                    </option>
                  </select>
                  <input
                    :value="option.price_delta"
                    @input="onOptionPriceInput($event, group.key, index)"
                    placeholder="+0 UZS"
                    class="editor-field"
                  />
                  <button
                    type="button"
                    @click="removeOptionRow(group.key, index)"
                    class="editor-remove-btn"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            </div>

            <div class="editor-panel">
            <div class="editor-section space-y-4">
              <div class="language-switcher">
                <button
                  @click="changeLanguage('uz')"
                  :class="{
                    'language-btn-active': currentLang === 'uz',
                  }"
                  class="language-btn"
                >
                  UZ
                </button>
                <button
                  @click="changeLanguage('ru')"
                  :class="{
                    'language-btn-active': currentLang === 'ru',
                  }"
                  class="language-btn"
                >
                  RU
                </button>
                <button
                  @click="changeLanguage('en')"
                  :class="{
                    'language-btn-active': currentLang === 'en',
                  }"
                  class="language-btn"
                >
                  EN
                </button>
              </div>

              <input
                v-model="newProduct.name[currentLang]"
                :placeholder="`Название (${currentLang.toUpperCase()})`"
                class="editor-field"
              />
              <textarea
                v-model="newProduct.description[currentLang]"
                :placeholder="`Описание (${currentLang.toUpperCase()})`"
                class="editor-field editor-textarea"
              ></textarea>
              <textarea
                v-model="newProduct.characteristic[currentLang]"
                :placeholder="`Характеристика (${currentLang.toUpperCase()})`"
                class="editor-field editor-textarea editor-textarea-tall"
              ></textarea>
            </div>

            <div class="editor-section space-y-3">
              <label class="editor-label">Изображения</label>
              <input
                type="file"
                multiple
                @change="handleFileChange"
                class="editor-upload"
              />
              <div class="editor-image-grid">
                <div
                  v-for="(src, i) in imagePreviews"
                  :key="i"
                  class="editor-image-card"
                >
                  <img
                    :src="src"
                    class="editor-image"
                    alt="image"
                  />
                  <button
                    @click="removeImage(i)"
                    class="editor-image-remove"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div class="editor-footer">
              <button
                @click="
                  showModal = false;
                  resetForm();
                "
                class="editor-cancel-btn"
              >
                Отмена
              </button>
              <button
                @click="addOrUpdateProduct"
                :disabled="loading"
                class="editor-submit-btn"
              >
                {{
                  loading
                    ? isUpdate
                      ? "Обновление..."
                      : "Добавление..."
                    : isUpdate
                      ? "Обновить"
                      : "Добавить"
                }}
              </button>
          </div>
        </Motion>
      </Motion>
    </AnimatePresence>
    <AnimatePresence>
      <Motion
        v-if="showDeleteModal"
        class="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50"
      >
        <Motion class="bg-white rounded-2xl w-96 p-6 shadow-2xl text-gray-800">
          <h2 class="text-xl font-bold mb-4 text-center text-red-600">
            Вы действительно хотите удалить этот продукт?
          </h2>
          <div class="flex justify-center space-x-4 mt-4">
            <button
              @click="showDeleteModal = false"
              class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-200 transition"
            >
              Нет
            </button>
            <button
              @click="deleteProduct"
              class="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white transition"
            >
              Да
            </button>
          </div>
        </Motion>
      </Motion>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.products-admin {
  min-height: calc(100vh - 3rem);
}

.products-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid rgba(20, 54, 108, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 32px rgba(8, 30, 72, 0.08);
  backdrop-filter: blur(14px);
}

.products-toolbar-copy {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex: 1 1 560px;
}

.products-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6a7f9e;
}

.products-title {
  margin-top: 0.2rem;
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  line-height: 1.08;
  font-weight: 800;
  color: #16315d;
}

.products-subtitle {
  margin-top: 0.45rem;
  max-width: 38rem;
  color: #7286a6;
}

.products-search {
  width: min(340px, 100%);
  height: 48px;
  border-radius: 16px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: #f8fbff;
  padding: 0 1rem;
  color: #173c74;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.products-search:focus {
  border-color: rgba(20, 79, 149, 0.32);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(26, 79, 149, 0.08);
}

.products-create-btn {
  min-width: 220px;
  height: 48px;
  border-radius: 16px;
  background: linear-gradient(135deg, #123560, #1c5297);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 16px 28px rgba(9, 33, 76, 0.18);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.products-create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 32px rgba(9, 33, 76, 0.24);
  filter: saturate(1.04);
}

.product-row {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 1rem;
  border: 1px solid rgba(20, 54, 108, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 16px 28px rgba(8, 30, 72, 0.06);
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease,
    border-color 0.24s ease;
}

.product-row:hover {
  transform: translateY(-2px);
  border-color: rgba(20, 54, 108, 0.16);
  box-shadow: 0 20px 34px rgba(8, 30, 72, 0.1);
}

.product-edit-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(19, 60, 116, 0.96);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 20px rgba(8, 30, 72, 0.18);
}

.product-gallery {
  width: 184px;
  flex-shrink: 0;
}

.product-swiper {
  width: 100%;
  height: 172px;
  border-radius: 20px;
  border: 1px solid rgba(20, 54, 108, 0.1);
  background: linear-gradient(180deg, #fbfdff, #eff5ff);
  overflow: hidden;
}

.product-gallery-image {
  width: 100%;
  height: 172px;
  object-fit: cover;
}

.product-copy {
  min-width: 0;
  flex: 1;
}

.product-meta-row {
  margin-bottom: 0.65rem;
}

.product-id-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(20, 79, 149, 0.08);
  color: #1a4f95;
  padding: 0.32rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.product-title {
  color: #16315d;
  font-size: 1.08rem;
  font-weight: 800;
  line-height: 1.35;
}

.product-description {
  margin-top: 0.5rem;
  color: #6c7f9d;
  font-size: 0.94rem;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.95rem;
}

.product-badge {
  border-radius: 999px;
  background: #eef4ff;
  color: #1a4f95;
  padding: 0.34rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.product-badge-credit {
  background: #e8f7ef;
  color: #20714a;
}

.product-price-box {
  min-width: 180px;
  padding-left: 1rem;
  border-left: 1px solid rgba(20, 54, 108, 0.08);
  text-align: right;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.product-price-label {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #8798b3;
}

.product-price-value {
  margin-top: 0.35rem;
  color: #143a6f;
  font-size: 1.18rem;
  font-weight: 800;
}

.product-pagination {
  display: flex;
  justify-content: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.product-page-btn {
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: rgba(255, 255, 255, 0.92);
  color: #173c74;
  font-weight: 700;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.product-page-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(20, 79, 149, 0.24);
  background: #f5f9ff;
}

.product-page-btn:disabled {
  opacity: 0.42;
}

.product-page-btn-active {
  border-color: transparent;
  background: #163f79;
  color: #ffffff;
  box-shadow: 0 12px 22px rgba(8, 30, 72, 0.18);
}

.editor-overlay {
  padding: 1rem;
  background: rgba(7, 19, 43, 0.44);
  backdrop-filter: blur(10px);
}

.editor-modal {
  width: min(1040px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 30px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background:
    radial-gradient(circle at top left, rgba(35, 95, 179, 0.08), transparent 24%),
    linear-gradient(180deg, #f9fbff 0%, #f2f6fb 100%);
  box-shadow: 0 28px 60px rgba(6, 24, 58, 0.28);
  padding: 1.2rem;
  color: #1b355f;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.editor-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6e83a3;
}

.editor-title {
  margin-top: 0.18rem;
  font-size: clamp(1.4rem, 2vw, 2rem);
  font-weight: 800;
  color: #16315d;
}

.editor-delete-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(226, 61, 61, 0.08);
  color: #cb4141;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.editor-layout {
  display: grid;
  grid-template-columns: 0.98fr 1.02fr;
  gap: 1rem;
}

.editor-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 24px;
  border: 1px solid rgba(20, 54, 108, 0.1);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 18px 30px rgba(8, 30, 72, 0.06);
}

.editor-panel-accent {
  background:
    linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(241, 246, 255, 0.92)),
    #ffffff;
}

.editor-section {
  padding: 1rem;
  border-radius: 20px;
  border: 1px solid rgba(20, 54, 108, 0.08);
  background: #f8fbff;
}

.editor-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.editor-section-title {
  font-size: 1rem;
  font-weight: 800;
  color: #16315d;
}

.editor-section-copy {
  margin-top: 0.28rem;
  color: #7084a4;
  font-size: 0.92rem;
  line-height: 1.5;
}

.editor-label {
  display: block;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #7286a6;
}

.editor-field {
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(20, 54, 108, 0.12);
  background: #ffffff;
  color: #1b355f;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.editor-field:focus {
  border-color: rgba(20, 79, 149, 0.32);
  box-shadow: 0 0 0 4px rgba(26, 79, 149, 0.08);
  background: #ffffff;
}

.editor-select {
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #5f7699 50%),
    linear-gradient(135deg, #5f7699 50%, transparent 50%);
  background-position:
    calc(100% - 18px) calc(50% - 3px),
    calc(100% - 12px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  padding-right: 2.8rem;
}

.editor-textarea {
  resize: vertical;
  min-height: 144px;
}

.editor-textarea-tall {
  min-height: 190px;
}

.editor-option-group {
  padding: 0.9rem;
  border-radius: 20px;
  border: 1px solid rgba(20, 54, 108, 0.08);
  background: rgba(255, 255, 255, 0.94);
}

.editor-option-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.editor-option-title {
  font-size: 0.98rem;
  font-weight: 800;
  color: #16315d;
}

.editor-option-copy {
  margin-top: 0.22rem;
  color: #6d82a3;
  font-size: 0.84rem;
}

.editor-option-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px 44px;
  gap: 0.7rem;
  align-items: center;
  margin-top: 0.75rem;
}

.editor-secondary-btn {
  min-width: 112px;
  height: 42px;
  border-radius: 14px;
  background: #173c74;
  color: #ffffff;
  font-weight: 700;
}

.editor-empty-state {
  margin-top: 0.75rem;
  padding: 0.95rem;
  border-radius: 16px;
  border: 1px dashed rgba(20, 54, 108, 0.18);
  color: #7488a8;
  background: rgba(246, 250, 255, 0.9);
}

.editor-remove-btn {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: rgba(221, 67, 67, 0.08);
  color: #cb4040;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.35rem;
}

.language-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(20, 54, 108, 0.06);
  border: 1px solid rgba(20, 54, 108, 0.08);
}

.credit-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(20, 54, 108, 0.06);
  border: 1px solid rgba(20, 54, 108, 0.08);
}

.credit-toggle-btn {
  min-width: 110px;
  height: 40px;
  padding: 0 1rem;
  border-radius: 999px;
  color: #6f83a3;
  font-weight: 700;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.credit-toggle-btn-active {
  background: #173c74;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(8, 30, 72, 0.16);
}

.language-btn {
  min-width: 62px;
  height: 40px;
  padding: 0 1rem;
  border-radius: 999px;
  color: #6f83a3;
  font-weight: 700;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.language-btn-active {
  background: #173c74;
  color: #ffffff;
  box-shadow: 0 10px 18px rgba(8, 30, 72, 0.16);
}

.editor-upload {
  width: 100%;
  padding: 0.85rem 0.95rem;
  border-radius: 16px;
  border: 1px dashed rgba(20, 54, 108, 0.2);
  background: rgba(255, 255, 255, 0.92);
}

.editor-image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 0.75rem;
}

.editor-image-card {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(20, 54, 108, 0.1);
  background: linear-gradient(180deg, #fbfdff, #f0f6ff);
}

.editor-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.editor-image-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(14, 27, 53, 0.66);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.editor-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  background: linear-gradient(180deg, rgba(249, 251, 255, 0), rgba(249, 251, 255, 0.9) 24%, #f9fbff 100%);
}

.editor-cancel-btn,
.editor-submit-btn {
  min-width: 150px;
  height: 48px;
  border-radius: 16px;
  font-weight: 700;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.editor-cancel-btn {
  background: #e7edf5;
  color: #49627f;
}

.editor-submit-btn {
  background: linear-gradient(135deg, #123560, #1c5297);
  color: #ffffff;
  box-shadow: 0 14px 24px rgba(8, 30, 72, 0.16);
}

.editor-submit-btn:hover,
.editor-cancel-btn:hover,
.editor-secondary-btn:hover,
.editor-delete-btn:hover,
.editor-remove-btn:hover {
  transform: translateY(-1px);
}

::v-deep(.swiper-button-next),
::v-deep(.swiper-button-prev) {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #133560, #1e5ea8);
  color: white;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  box-shadow: 0 8px 16px rgba(8, 30, 72, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
::v-deep(.swiper-button-next:hover),
::v-deep(.swiper-button-prev:hover) {
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 10px 20px rgba(8, 30, 72, 0.28);
}

@media (max-width: 1024px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .products-toolbar-copy {
    flex-direction: column;
    align-items: stretch;
  }

  .products-search,
  .products-create-btn {
    width: 100%;
  }

  .product-row {
    flex-direction: column;
    align-items: stretch;
    padding-top: 3.4rem;
  }

  .product-edit-btn {
    top: 0.9rem;
    right: 0.9rem;
  }

  .product-gallery {
    width: 100%;
  }

  .product-price-box {
    min-width: 0;
    padding-left: 0;
    padding-top: 0.9rem;
    border-left: 0;
    border-top: 1px solid rgba(20, 54, 108, 0.08);
    text-align: left;
  }

  .editor-modal {
    padding: 1rem;
    border-radius: 24px;
  }

  .editor-header {
    align-items: center;
  }

  .editor-option-row {
    grid-template-columns: 1fr;
  }

  .editor-remove-btn {
    width: 100%;
  }

  .editor-footer {
    flex-direction: column-reverse;
  }

  .editor-cancel-btn,
  .editor-submit-btn {
    width: 100%;
  }

  .language-switcher {
    width: 100%;
    justify-content: space-between;
  }

  .credit-toggle {
    width: 100%;
    justify-content: space-between;
  }

  .language-btn {
    flex: 1;
  }

  .credit-toggle-btn {
    flex: 1;
  }
}
</style>
