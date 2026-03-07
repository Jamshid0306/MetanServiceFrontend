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
      placeholder: "Автомат",
    };
  }

  if (group.key === "cylinder_volume") {
    return {
      ...group,
      title: "Объем баллона",
      hint: "Например: 75, 85, 90, 95.",
      placeholder: "85 л",
    };
  }

  return {
    ...group,
    title: "Позиция баллона",
    hint: "Например: 2, 3, 4.",
    placeholder: "2",
  };
});

const createInitialProduct = () => ({
  price: "",
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

const onOptionPriceInput = (event, groupKey, index) => {
  newProduct.value.options[groupKey][index].price_delta = formatNumericInput(
    event.target.value
  );
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
</script>
<template>
  <div class="p-6 space-y-6">
    <Notification :message="notifMessage" :show="notifShow" type="success" />
    <div class="flex items-center justify-between">
      <div class="flex gap-[40px] w-full">
        <h2 class="text-indigo-700 font-bold text-3xl">Список продуктов</h2>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск продукта..."
          class="w-[300px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <button
        @click="
          showModal = true;
          resetForm();
        "
        class="px-6 py-2 bg-indigo-700 text-white w-[300px] font-semibold rounded-lg shadow-lg hover:bg-indigo-800 transition"
      >
        Добавить продукт
      </button>
    </div>
    <div class="space-y-6">
      <AnimatePresence>
        <Motion
          v-for="(product, i) in paginatedProducts"
          :key="product.id"
          class="relative flex items-center justify-between p-4 bg-white rounded-xl shadow-md hover:shadow-xl transition group"
          :initial="{ opacity: 0, y: 20 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: -20 }"
          :transition="{ duration: 0.25, delay: 0.05 }"
        >
          <button
            @click.stop="openUpdateModal(product)"
            class="absolute cursor-pointer top-2 right-2 bg-indigo-700 text-white w-8 h-8 rounded-full flex items-center justify-center transition"
          >
            <Pencil :size="20" />
          </button>
          <div class="w-42 h-42 relative flex-shrink-0">
            <Swiper
              :modules="[Navigation, Pagination]"
              pagination
              class="w-full h-40 rounded overflow-hidden relative"
            >
              <SwiperSlide
                v-for="(img, index) in normalizeImages(product.images)"
                :key="index"
              >
                <img :src="img" class="w-full h-40 object-cover" alt="Image" />
              </SwiperSlide>
            </Swiper>
          </div>
          <div class="flex-1 space-y-1 ml-4">
            <div class="text-indigo-700 font-bold text-lg">
              {{ product.name_ru }}
            </div>
            <div class="text-gray-500 text-sm line-clamp-3">
              {{ product.description_ru }}
            </div>
            <div
              v-if="getProductOptionBadges(product).length"
              class="flex flex-wrap gap-2 pt-2"
            >
              <span
                v-for="badge in getProductOptionBadges(product)"
                :key="badge.key"
                class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700"
              >
                {{ badge.title }}: {{ badge.count }}
              </span>
            </div>
          </div>
          <div class="text-indigo-700 font-semibold text-lg">
            {{ formatPrice(product.price_ru) }}
          </div>
        </Motion>
      </AnimatePresence>
      <div class="flex justify-center mt-6 space-x-2">
        <button
          @click="goToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          &lt;
        </button>
        <button
          v-for="page in totalPages"
          :key="page"
          @click="goToPage(page)"
          :class="{
            'bg-indigo-700 text-white': currentPage === page,
            'bg-gray-200 text-gray-800': currentPage !== page,
          }"
          class="px-3 py-1 rounded hover:bg-indigo-700 hover:text-white"
        >
          {{ page }}
        </button>
        <button
          @click="goToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
        >
          &gt;
        </button>
      </div>
    </div>

    <AnimatePresence>
      <Motion
        v-if="showModal"
        class="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50"
      >
        <Motion
          class="bg-gradient-to-br from-[#f5f1ff] to-white rounded-2xl w-[680px] max-w-[calc(100vw-2rem)] p-6 shadow-2xl relative text-gray-800 max-h-[85vh] overflow-y-auto"
        >
          <button
            v-if="isUpdate"
            @click="showDeleteModal = true"
            class="cursor-pointer text-red-500 absolute top-4 right-4"
          >
            <Delete :size="30" />
          </button>
          <h2 class="text-2xl font-bold mb-4 text-center text-indigo-700">
            {{ isUpdate ? "Обновить продукт" : "Добавить продукт" }}
          </h2>
          <div class="space-y-4">
            <div class="space-y-2">
              <select
                v-model="priceType"
                class="border rounded border-gray-300 w-full h-[42px] cursor-pointer focus:ring-indigo-400 outline-none mb-2"
              >
                <option value="show">Показать цену</option>
                <option value="request">Не показывать цену</option>
              </select>

              <input
                v-if="priceType === 'show'"
                v-model="newProduct.price"
                @input="onPriceInput"
                placeholder="0 UZS"
                class="w-full px-4 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div class="rounded-2xl border border-indigo-100 bg-white/80 p-4 space-y-4">
              <div>
                <h3 class="text-lg font-semibold text-indigo-800">
                  Варианты и доплата
                </h3>
                <p class="text-sm text-slate-500">
                  Добавьте только доступные категории для этого товара. Пользователь
                  увидит только эти варианты, а цена посчитается автоматически.
                </p>
              </div>

              <div
                v-for="group in adminOptionGroups"
                :key="group.key"
                class="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h4 class="font-semibold text-slate-800">{{ group.title }}</h4>
                    <p class="text-xs text-slate-500">{{ group.hint }}</p>
                  </div>
                  <button
                    type="button"
                    @click="addOptionRow(group.key)"
                    class="shrink-0 rounded-lg bg-indigo-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-800"
                  >
                    Добавить
                  </button>
                </div>

                <div
                  v-if="!newProduct.options[group.key].length"
                  class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500"
                >
                  Варианты ещё не добавлены.
                </div>

                <div
                  v-for="(option, index) in newProduct.options[group.key]"
                  :key="option.id"
                  class="grid gap-2 items-center sm:grid-cols-[minmax(0,1fr)_160px_40px]"
                >
                  <input
                    v-model="option.label"
                    :placeholder="group.placeholder"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <input
                    :value="option.price_delta"
                    @input="onOptionPriceInput($event, group.key, index)"
                    placeholder="+0 UZS"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <button
                    type="button"
                    @click="removeOptionRow(group.key, index)"
                    class="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500 transition hover:bg-red-100"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
            <div class="flex space-x-4 mb-4 justify-center">
              <button
                @click="changeLanguage('uz')"
                :class="{
                  'bg-indigo-700 text-white': currentLang === 'uz',
                  'bg-gray-200 text-gray-800': currentLang !== 'uz',
                }"
                class="px-4 py-2 rounded"
              >
                UZ
              </button>
              <button
                @click="changeLanguage('ru')"
                :class="{
                  'bg-indigo-700 text-white': currentLang === 'ru',
                  'bg-gray-200 text-gray-800': currentLang !== 'ru',
                }"
                class="px-4 py-2 rounded"
              >
                RU
              </button>
              <button
                @click="changeLanguage('en')"
                :class="{
                  'bg-indigo-700 text-white': currentLang === 'en',
                  'bg-gray-200 text-gray-800': currentLang !== 'en',
                }"
                class="px-4 py-2 rounded"
              >
                EN
              </button>
            </div>
            <input
              v-model="newProduct.name[currentLang]"
              :placeholder="`Название (${currentLang.toUpperCase()})`"
              class="w-full px-4 py-2 rounded border border-gray-300"
            />
            <textarea
              v-model="newProduct.description[currentLang]"
              :placeholder="`Описание (${currentLang.toUpperCase()})`"
              class="w-full px-4 py-2 rounded border border-gray-300"
            ></textarea>
            <!-- Xarakteristika inputlari -->
            <div class="space-y-2">
              <textarea
                v-model="newProduct.characteristic[currentLang]"
                :placeholder="`Характеристика (${currentLang.toUpperCase()})`"
                class="w-full px-4 py-2 rounded border border-gray-300"
              ></textarea>
            </div>
            <div class="space-y-2">
              <label class="block text-gray-700">Выберите изображения</label>
              <input
                type="file"
                multiple
                @change="handleFileChange"
                class="w-full text-gray-800 border border-gray-300 rounded px-2 py-1"
              />
              <div class="flex flex-wrap gap-2 mt-2">
                <div
                  v-for="(src, i) in imagePreviews"
                  :key="i"
                  class="relative"
                >
                  <img
                    :src="src"
                    class="w-16 h-16 object-cover rounded-lg"
                    alt="image"
                  />
                  <button
                    @click="removeImage(i)"
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                  >
                    x
                  </button>
                </div>
              </div>
            </div>

            <div class="flex justify-end space-x-2 mt-4">
              <button
                @click="
                  showModal = false;
                  resetForm();
                "
                class="px-4 py-2 rounded bg-gray-300 hover:bg-gray-200 transition"
              >
                Отмена
              </button>
              <button
                @click="addOrUpdateProduct"
                :disabled="loading"
                class="px-4 py-2 rounded bg-indigo-700 hover:bg-indigo-700 text-white transition"
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
::v-deep(.swiper-button-next),
::v-deep(.swiper-button-prev) {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #7e22ce, #9333ea);
  color: white;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
::v-deep(.swiper-button-next:hover),
::v-deep(.swiper-button-prev:hover) {
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.3);
}
</style>
