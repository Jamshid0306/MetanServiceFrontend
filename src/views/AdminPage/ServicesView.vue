<script setup>
import { computed, onMounted, ref } from "vue";
import { Motion, AnimatePresence } from "motion-v";
import Notification from "@/components/Notification.vue";
import Delete from "@/components/icons/Delete.vue";
import Pencil from "@/components/icons/Pencil.vue";
import { useAdminStore } from "@/store/adminStore";

const store = useAdminStore();
const showModal = ref(false);
const showDeleteModal = ref(false);
const isUpdate = ref(false);
const currentServiceId = ref(null);
const currentLang = ref("uz");
const saving = ref(false);
const notifShow = ref(false);
const notifMessage = ref("");
const productSearch = ref("");

const createInitialService = () => ({
  name: { uz: "", ru: "", en: "" },
  characteristic: { uz: "", ru: "", en: "" },
  price: { uz: "", ru: "", en: "" },
  product_ids: [],
});

const serviceForm = ref(createInitialService());

const showNotification = (message) => {
  notifMessage.value = message;
  notifShow.value = true;
};

const formatNumericInput = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const resetForm = () => {
  serviceForm.value = createInitialService();
  isUpdate.value = false;
  currentServiceId.value = null;
  currentLang.value = "uz";
  saving.value = false;
  productSearch.value = "";
};

const openCreateModal = () => {
  resetForm();
  showModal.value = true;
};

const openUpdateModal = (service) => {
  isUpdate.value = true;
  currentServiceId.value = service.id;
  serviceForm.value = {
    name: {
      uz: service.name_uz || "",
      ru: service.name_ru || "",
      en: service.name_en || "",
    },
    characteristic: {
      uz: service.characteristic_uz || "",
      ru: service.characteristic_ru || "",
      en: service.characteristic_en || "",
    },
    price: {
      uz: formatNumericInput(service.price_uz),
      ru: formatNumericInput(service.price_ru),
      en: formatNumericInput(service.price_en),
    },
    product_ids: Array.isArray(service.product_ids) ? [...service.product_ids] : [],
  };
  showModal.value = true;
};

const toggleProduct = (productId) => {
  const next = new Set(serviceForm.value.product_ids);
  if (next.has(productId)) {
    next.delete(productId);
  } else {
    next.add(productId);
  }
  serviceForm.value.product_ids = [...next];
};

const submitService = async () => {
  saving.value = true;

  const payload = {
    name_uz: serviceForm.value.name.uz.trim(),
    name_ru: serviceForm.value.name.ru.trim(),
    name_en: serviceForm.value.name.en.trim(),
    characteristic_uz: serviceForm.value.characteristic.uz.trim(),
    characteristic_ru: serviceForm.value.characteristic.ru.trim(),
    characteristic_en: serviceForm.value.characteristic.en.trim(),
    price_uz: serviceForm.value.price.uz.trim(),
    price_ru: serviceForm.value.price.ru.trim(),
    price_en: serviceForm.value.price.en.trim(),
    product_ids: [...serviceForm.value.product_ids],
  };

  if (!payload.name_uz || !payload.name_ru || !payload.name_en) {
    saving.value = false;
    showNotification("Xizmat nomlarini 3 tilda to‘ldiring.");
    return;
  }

  if (!payload.price_uz || !payload.price_ru || !payload.price_en) {
    saving.value = false;
    showNotification("Xizmat narxlarini 3 tilda kiriting.");
    return;
  }

  const success = isUpdate.value
    ? await store.updateService(currentServiceId.value, payload)
    : await store.createService(payload);

  saving.value = false;
  if (!success) {
    return;
  }

  showModal.value = false;
  resetForm();
  showNotification(isUpdate.value ? "Xizmat yangilandi." : "Xizmat qo‘shildi.");
};

const confirmDelete = async () => {
  if (!currentServiceId.value) return;
  const success = await store.deleteService(currentServiceId.value);
  if (!success) return;
  showDeleteModal.value = false;
  showModal.value = false;
  resetForm();
  showNotification("Xizmat o‘chirildi.");
};

const services = computed(() =>
  Array.isArray(store.services) ? store.services : []
);
const products = computed(() =>
  Array.isArray(store.products) ? store.products : []
);
const selectedProductsCount = computed(() => serviceForm.value.product_ids.length);
const filteredProducts = computed(() => {
  const query = String(productSearch.value || "").trim().toLowerCase();
  if (!query) {
    return products.value;
  }

  return products.value.filter((product) => {
    const id = String(product.id || "");
    const nameRu = String(product.name_ru || "").toLowerCase();
    const nameUz = String(product.name_uz || "").toLowerCase();
    const nameEn = String(product.name_en || "").toLowerCase();
    return (
      id.includes(query) ||
      nameRu.includes(query) ||
      nameUz.includes(query) ||
      nameEn.includes(query)
    );
  });
});

onMounted(async () => {
  if (!store.products.length) {
    await store.getProducts();
  }
  await store.getServices();
});
</script>

<template>
  <div class="services-admin space-y-6">
    <Notification
      :message="notifMessage"
      :show="notifShow"
      :show-basket-action="false"
      @close="notifShow = false"
    />

    <div class="services-toolbar">
      <div>
        <p class="services-eyebrow">Услуги</p>
        <h2 class="services-title">Дополнительные услуги</h2>
        <p class="services-subtitle">
          Создавайте отдельные услуги и привязывайте их к нужным товарам.
        </p>
      </div>

      <button type="button" class="services-create-btn" @click="openCreateModal">
        Добавить услугу
      </button>
    </div>

    <div class="services-grid">
      <AnimatePresence>
        <Motion
          v-for="service in services"
          :key="service.id"
          class="service-card"
          :initial="{ opacity: 0, y: 18 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: -18 }"
          :transition="{ duration: 0.2 }"
        >
          <button type="button" class="service-edit-btn" @click="openUpdateModal(service)">
            <Pencil :size="18" />
          </button>

          <span class="service-id-chip">#{{ service.id }}</span>
          <h3 class="service-name">{{ service.name_ru }}</h3>
          <p class="service-characteristic">
            {{ service.characteristic_ru || "Характеристика не заполнена" }}
          </p>
          <div class="service-price-row">
            <strong>{{ service.price_ru }}</strong>
            <span>сум</span>
          </div>
          <p class="service-products">
            Товары: {{ Array.isArray(service.product_ids) ? service.product_ids.length : 0 }}
          </p>
        </Motion>
      </AnimatePresence>
    </div>

    <AnimatePresence>
      <Motion
        v-if="showModal"
        class="editor-overlay fixed inset-0 z-50 flex items-center justify-center"
      >
        <Motion class="editor-modal service-editor-modal">
          <div class="service-modal-hero">
            <div class="service-modal-hero-copy">
              <p class="editor-eyebrow">
                {{ isUpdate ? "Редактирование" : "Новая услуга" }}
              </p>
              <h2 class="editor-title">
                {{ isUpdate ? "Обновить услугу" : "Добавить услугу" }}
              </h2>
              <p class="service-modal-subtitle">
                Настройте многоязычное описание услуги, стоимость и список товаров, где она будет доступна клиенту.
              </p>
            </div>

            <div class="service-modal-stats">
              <div class="service-stat-card">
                <span>Язык</span>
                <strong>{{ currentLang.toUpperCase() }}</strong>
              </div>
              <div class="service-stat-card">
                <span>Товаров</span>
                <strong>{{ selectedProductsCount }}</strong>
              </div>
            </div>
          </div>

          <div class="editor-header service-modal-header">
            <div>
              <p class="service-modal-section-label">Контент и привязка</p>
            </div>
            <button
              v-if="isUpdate"
              type="button"
              class="editor-delete-btn"
              @click="showDeleteModal = true"
            >
              <Delete :size="24" />
            </button>
          </div>

          <div class="editor-lang-switch">
            <button
              v-for="lang in ['uz', 'ru', 'en']"
              :key="lang"
              type="button"
              class="editor-lang-btn"
              :class="{ 'editor-lang-btn-active': currentLang === lang }"
              @click="currentLang = lang"
            >
              {{ lang.toUpperCase() }}
            </button>
          </div>

          <div class="service-editor-grid">
            <div class="editor-panel service-form-panel">
              <div class="service-panel-head">
                <div>
                  <h3 class="editor-section-title">Текущий язык: {{ currentLang.toUpperCase() }}</h3>
                  <p class="editor-section-copy">
                    Все поля ниже редактируются для выбранного языка.
                  </p>
                </div>
              </div>

              <label class="editor-label">
                Название услуги
                <input
                  v-model="serviceForm.name[currentLang]"
                  type="text"
                  class="editor-field service-editor-field"
                  :placeholder="`Введите название (${currentLang.toUpperCase()})`"
                />
              </label>

              <label class="editor-label">
                Характеристика / описание
                <textarea
                  v-model="serviceForm.characteristic[currentLang]"
                  rows="7"
                  class="editor-field editor-textarea service-editor-field"
                  :placeholder="`Кратко опишите услугу (${currentLang.toUpperCase()})`"
                ></textarea>
              </label>

              <label class="editor-label">
                Цена
                <div class="service-price-input-wrap">
                  <input
                    :value="serviceForm.price[currentLang]"
                    type="text"
                    class="editor-field service-editor-field"
                    placeholder="Например: 250 000"
                    @input="serviceForm.price[currentLang] = formatNumericInput($event.target.value)"
                  />
                  <span class="service-price-suffix">сум</span>
                </div>
              </label>

              <div class="service-language-preview">
                <div class="service-language-preview-row">
                  <span>UZ</span>
                  <strong>{{ serviceForm.name.uz || "—" }}</strong>
                </div>
                <div class="service-language-preview-row">
                  <span>RU</span>
                  <strong>{{ serviceForm.name.ru || "—" }}</strong>
                </div>
                <div class="service-language-preview-row">
                  <span>EN</span>
                  <strong>{{ serviceForm.name.en || "—" }}</strong>
                </div>
              </div>
            </div>

            <div class="editor-panel service-products-panel">
              <div class="editor-section-head service-products-head">
                <div>
                  <h3 class="editor-section-title">Связанные товары</h3>
                  <p class="editor-section-copy">
                    Отметьте товары, где эта услуга должна отображаться у клиента.
                  </p>
                </div>
              </div>

              <div class="service-products-toolbar">
                <input
                  v-model="productSearch"
                  type="text"
                  class="editor-field service-editor-field service-search-field"
                  placeholder="Поиск по ID или названию товара..."
                />
                <div class="service-selected-pill">
                  Выбрано: {{ selectedProductsCount }}
                </div>
              </div>

              <div class="service-products-list">
                <label
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="service-product-item"
                  :class="{
                    'service-product-item-active': serviceForm.product_ids.includes(product.id),
                  }"
                >
                  <input
                    type="checkbox"
                    :checked="serviceForm.product_ids.includes(product.id)"
                    @change="toggleProduct(product.id)"
                  />
                  <div class="service-product-copy">
                    <strong>#{{ product.id }} {{ product.name_ru }}</strong>
                    <span>{{ product.name_uz || product.name_en || "Название не заполнено" }}</span>
                  </div>
                </label>
                <div v-if="!filteredProducts.length" class="service-empty-state">
                  По вашему поиску товары не найдены.
                </div>
              </div>
            </div>
          </div>

          <div class="editor-actions service-modal-actions">
            <button type="button" class="editor-secondary-btn" @click="showModal = false">
              Отмена
            </button>
            <button type="button" class="products-create-btn" :disabled="saving" @click="submitService">
              {{ saving ? "Сохранение..." : isUpdate ? "Сохранить" : "Создать" }}
            </button>
          </div>
        </Motion>
      </Motion>
    </AnimatePresence>

    <AnimatePresence>
      <Motion
        v-if="showDeleteModal"
        class="editor-overlay fixed inset-0 z-[60] flex items-center justify-center"
      >
        <Motion class="delete-modal">
          <h3 class="delete-title">Удалить услугу?</h3>
          <p class="delete-copy">Это действие уберёт услугу и отвяжет её от товаров.</p>
          <div class="delete-actions">
            <button type="button" class="editor-secondary-btn" @click="showDeleteModal = false">
              Отмена
            </button>
            <button type="button" class="editor-delete-btn-solid" @click="confirmDelete">
              Удалить
            </button>
          </div>
        </Motion>
      </Motion>
    </AnimatePresence>
  </div>
</template>

<style scoped>
.services-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.services-eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6b7f9b;
}

.services-title {
  font-size: 1.8rem;
  font-weight: 800;
  color: #14315f;
}

.services-subtitle {
  margin-top: 0.35rem;
  color: #5f7290;
}

.services-create-btn,
.editor-delete-btn-solid {
  border: none;
  border-radius: 14px;
  padding: 0.85rem 1.15rem;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #18304f 0%, #24466f 100%);
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.service-card {
  position: relative;
  border-radius: 24px;
  border: 1px solid rgba(20, 49, 95, 0.08);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 30px rgba(20, 49, 95, 0.07);
  padding: 1.2rem;
}

.service-edit-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  border: none;
  background: transparent;
  color: #14315f;
}

.service-id-chip {
  display: inline-flex;
  border-radius: 999px;
  background: #eef4fb;
  color: #14315f;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 0.25rem 0.55rem;
}

.service-name {
  margin-top: 0.9rem;
  font-size: 1.12rem;
  font-weight: 800;
  color: #14315f;
}

.service-characteristic {
  margin-top: 0.5rem;
  color: #5f7290;
  line-height: 1.55;
}

.service-price-row {
  margin-top: 1rem;
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  color: #14315f;
}

.service-products {
  margin-top: 0.45rem;
  color: #6b7f9b;
  font-size: 0.9rem;
}

.service-editor-modal {
  width: min(1080px, calc(100vw - 2rem));
  max-height: min(92vh, 980px);
  overflow: hidden;
}

.service-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.service-modal-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.2rem 0.5rem;
}

.service-modal-hero-copy {
  max-width: 720px;
}

.service-modal-subtitle {
  margin-top: 0.45rem;
  color: rgba(219, 231, 251, 0.82);
  line-height: 1.6;
}

.service-modal-stats {
  display: flex;
  gap: 0.75rem;
}

.service-stat-card {
  min-width: 108px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.85rem 0.95rem;
}

.service-stat-card span {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(219, 231, 251, 0.72);
}

.service-stat-card strong {
  display: block;
  margin-top: 0.3rem;
  font-size: 1.15rem;
  color: #fff;
}

.service-modal-header {
  padding-top: 0.4rem;
}

.service-modal-section-label {
  color: rgba(219, 231, 251, 0.72);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.editor-label {
  display: grid;
  gap: 0.45rem;
  color: #dbe7fb;
  font-size: 0.92rem;
  font-weight: 700;
}

.service-form-panel,
.service-products-panel {
  display: grid;
  gap: 1rem;
}

.service-panel-head,
.service-products-head {
  margin-bottom: 0.15rem;
}

.service-editor-field {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
}

.service-editor-field::placeholder {
  color: rgba(219, 231, 251, 0.45);
}

.service-price-input-wrap {
  position: relative;
}

.service-price-suffix {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  color: rgba(219, 231, 251, 0.72);
  font-size: 0.82rem;
  font-weight: 700;
  pointer-events: none;
}

.service-language-preview {
  display: grid;
  gap: 0.55rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.9rem 1rem;
}

.service-language-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.service-language-preview-row span {
  min-width: 2rem;
  color: rgba(219, 231, 251, 0.72);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.service-language-preview-row strong {
  color: #fff;
  font-size: 0.92rem;
  text-align: right;
}

.service-products-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.service-search-field {
  flex: 1;
}

.service-selected-pill {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(94, 234, 212, 0.1);
  color: #ccfbf1;
  border: 1px solid rgba(94, 234, 212, 0.22);
  padding: 0.65rem 0.85rem;
  font-size: 0.84rem;
  font-weight: 700;
}

.service-products-list {
  display: grid;
  gap: 0.65rem;
  max-height: 360px;
  overflow: auto;
  padding-right: 0.2rem;
}

.service-product-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid transparent;
  padding: 0.9rem 0.95rem;
  color: #ecf3ff;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
}

.service-product-item:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.09);
}

.service-product-item-active {
  border-color: rgba(125, 211, 252, 0.4);
  background: rgba(56, 189, 248, 0.12);
}

.service-product-copy {
  display: grid;
  gap: 0.25rem;
}

.service-product-copy strong {
  color: #fff;
  font-size: 0.92rem;
}

.service-product-copy span {
  color: rgba(219, 231, 251, 0.72);
  font-size: 0.84rem;
  line-height: 1.45;
}

.service-empty-state {
  border-radius: 16px;
  border: 1px dashed rgba(219, 231, 251, 0.2);
  padding: 1rem;
  text-align: center;
  color: rgba(219, 231, 251, 0.72);
}

.delete-modal {
  width: min(420px, calc(100vw - 2rem));
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
  padding: 1.5rem;
}

.delete-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #142338;
}

.delete-copy {
  margin-top: 0.5rem;
  color: #5f7290;
}

.delete-actions,
.editor-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.service-modal-actions {
  position: sticky;
  bottom: 0;
  margin-top: 1.1rem;
  padding: 1rem 0 0;
  background: linear-gradient(180deg, rgba(11, 25, 49, 0) 0%, rgba(11, 25, 49, 0.96) 32%);
}

@media (max-width: 900px) {
  .service-editor-grid {
    grid-template-columns: 1fr;
  }

  .service-modal-hero {
    flex-direction: column;
  }

  .service-modal-stats,
  .service-products-toolbar {
    width: 100%;
  }

  .service-products-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
