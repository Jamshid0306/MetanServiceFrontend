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
const notifVariant = ref("success");
const productSearch = ref("");

const createInitialService = () => ({
  name: { uz: "", ru: "", en: "" },
  characteristic: { uz: "", ru: "", en: "" },
  price: { uz: "", ru: "", en: "" },
  product_ids: [],
});

const serviceForm = ref(createInitialService());

const showNotification = (message, variant = "success") => {
  notifMessage.value = message;
  notifVariant.value = variant;
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
    showNotification("Xizmat nomlarini 3 tilda to‘ldiring.", "error");
    return;
  }

  if (!payload.price_uz || !payload.price_ru || !payload.price_en) {
    saving.value = false;
    showNotification("Xizmat narxlarini 3 tilda kiriting.", "error");
    return;
  }

  const success = isUpdate.value
    ? await store.updateService(currentServiceId.value, payload)
    : await store.createService(payload);

  saving.value = false;
  if (!success) {
    showNotification("Xizmatni saqlashda xatolik yuz berdi.", "error");
    return;
  }

  showModal.value = false;
  resetForm();
  showNotification(isUpdate.value ? "Xizmat yangilandi." : "Xizmat qo‘shildi.");
};

const confirmDelete = async () => {
  if (!currentServiceId.value) return;
  const success = await store.deleteService(currentServiceId.value);
  if (!success) {
    showNotification("Xizmatni o‘chirishda xatolik yuz berdi.", "error");
    return;
  }
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
      :variant="notifVariant"
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
        class="editor-overlay service-editor-overlay fixed inset-0 z-50 flex items-center justify-center"
      >
        <Motion class="editor-modal service-editor-modal">
          <div class="service-modal-scroll">
            <div class="service-modal-hero">
              <div class="service-modal-hero-copy">
                <div class="service-modal-topline">
                  <p class="editor-eyebrow">
                    {{ isUpdate ? "Редактирование" : "Новая услуга" }}
                  </p>
                  <span class="service-modal-chip">
                    {{ isUpdate ? "Режим обновления" : "Черновик" }}
                  </span>
                </div>
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
                  <small>Текущая вкладка</small>
                </div>
                <div class="service-stat-card">
                  <span>Товаров</span>
                  <strong>{{ selectedProductsCount }}</strong>
                  <small>Выбрано в услуге</small>
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

            <div class="service-lang-switch-wrap">
              <p class="service-lang-switch-label">Языковые версии</p>
              <div class="editor-lang-switch service-lang-switch">
                <button
                  v-for="lang in [
                    { key: 'uz', title: 'UZ', subtitle: 'O‘zbekcha' },
                    { key: 'ru', title: 'RU', subtitle: 'Русский' },
                    { key: 'en', title: 'EN', subtitle: 'English' },
                  ]"
                  :key="lang.key"
                  type="button"
                  class="editor-lang-btn service-lang-btn"
                  :class="{ 'editor-lang-btn-active service-lang-btn-active': currentLang === lang.key }"
                  @click="currentLang = lang.key"
                >
                  <span class="service-lang-btn-title">{{ lang.title }}</span>
                  <span class="service-lang-btn-subtitle">{{ lang.subtitle }}</span>
                </button>
              </div>
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
                  <div class="service-form-badge">
                    {{ serviceForm.name[currentLang] ? "Заполнено" : "Нужно название" }}
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
                  <div class="service-language-preview-head">
                    <div>
                      <h4>Быстрый обзор переводов</h4>
                      <p>Сразу видно, какие языки уже заполнены.</p>
                    </div>
                  </div>

                  <div class="service-language-preview-row">
                    <span>UZ</span>
                    <strong>{{ serviceForm.name.uz || "—" }}</strong>
                    <em>{{ serviceForm.price.uz || "Цена не указана" }}</em>
                  </div>
                  <div class="service-language-preview-row">
                    <span>RU</span>
                    <strong>{{ serviceForm.name.ru || "—" }}</strong>
                    <em>{{ serviceForm.price.ru || "Цена не указана" }}</em>
                  </div>
                  <div class="service-language-preview-row">
                    <span>EN</span>
                    <strong>{{ serviceForm.name.en || "—" }}</strong>
                    <em>{{ serviceForm.price.en || "Цена не указана" }}</em>
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

                <div class="service-selection-note">
                  Отмеченные товары сразу получат эту услугу в клиентской карточке товара.
                </div>
              </div>
            </div>

            <div class="editor-actions service-modal-actions">
              <button type="button" class="editor-secondary-btn service-modal-action-btn" @click="showModal = false">
                Отмена
              </button>
              <button
                type="button"
                class="products-create-btn service-modal-action-btn"
                :disabled="saving"
                @click="submitService"
              >
                {{ saving ? "Сохранение..." : isUpdate ? "Сохранить" : "Создать" }}
              </button>
            </div>
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
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(214, 228, 247, 0.72);
  border-radius: 32px;
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  box-shadow:
    0 34px 90px rgba(15, 23, 42, 0.34),
    0 12px 30px rgba(20, 49, 95, 0.16);
}

.service-editor-overlay {
  background:
    radial-gradient(circle at top, rgba(55, 119, 191, 0.16), transparent 24%),
    rgba(4, 12, 24, 0.7);
  backdrop-filter: blur(14px);
  padding: 1rem;
  overflow: hidden;
}

.service-modal-scroll {
  flex: 1 1 auto;
  display: grid;
  gap: 0;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 1.35rem;
}

.service-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 1.1rem;
  align-items: start;
  padding: 0 1.35rem;
}

.service-modal-hero {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1.35rem 1.35rem 0.85rem;
}

.service-modal-hero-copy {
  max-width: 720px;
}

.service-modal-topline {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.service-modal-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid rgba(20, 49, 95, 0.08);
  background: #eef5fd;
  color: #1c4a7b;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.service-modal-subtitle {
  margin-top: 0.45rem;
  max-width: 660px;
  color: #67809e;
  line-height: 1.6;
}

.service-modal-stats {
  display: flex;
  gap: 0.75rem;
}

.service-stat-card {
  min-width: 132px;
  border: 1px solid rgba(20, 49, 95, 0.08);
  border-radius: 22px;
  background: linear-gradient(180deg, #ffffff, #f6faff);
  padding: 0.95rem 1rem;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.service-stat-card span {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6c84a2;
}

.service-stat-card strong {
  display: block;
  margin-top: 0.34rem;
  font-size: 1.2rem;
  color: #16315d;
}

.service-stat-card small {
  display: block;
  margin-top: 0.22rem;
  color: #7a91ad;
  font-size: 0.72rem;
  line-height: 1.4;
}

.service-modal-header {
  padding-left: 1.35rem;
  padding-right: 1.35rem;
  padding-top: 0.4rem;
}

.service-modal-section-label {
  color: #7890ad;
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

.service-lang-switch-wrap {
  padding: 0.3rem 1.35rem 0;
}

.service-lang-switch-label {
  margin-bottom: 0.6rem;
  color: #6f84a1;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.service-lang-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
}

.service-lang-btn {
  display: grid;
  justify-items: start;
  gap: 0.15rem;
  min-height: 72px;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  border: 1px solid rgba(20, 49, 95, 0.08);
  background: linear-gradient(180deg, #fbfdff 0%, #f4f9ff 100%);
  color: #16315d;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}

.service-lang-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(20, 79, 149, 0.14);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.service-lang-btn-active {
  border-color: rgba(31, 99, 177, 0.18);
  background:
    radial-gradient(circle at top right, rgba(186, 222, 255, 0.46), transparent 42%),
    linear-gradient(180deg, #e9f4ff 0%, #f5faff 100%);
  box-shadow: 0 14px 28px rgba(20, 79, 149, 0.1);
}

.service-lang-btn-title {
  font-size: 0.96rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.service-lang-btn-subtitle {
  color: #627a99;
  font-size: 0.78rem;
  font-weight: 700;
}

.service-form-panel,
.service-products-panel {
  display: grid;
  gap: 1rem;
  border-radius: 26px;
  background: #ffffff;
  border: 1px solid rgba(20, 49, 95, 0.07);
  box-shadow:
    0 18px 42px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  padding: 1.2rem;
}

.service-panel-head,
.service-products-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.15rem;
}

.service-form-badge {
  flex-shrink: 0;
  min-height: 34px;
  padding: 0.5rem 0.8rem;
  border-radius: 999px;
  background: linear-gradient(180deg, #eff7ff 0%, #e8f3ff 100%);
  color: #1b4d84;
  border: 1px solid rgba(27, 77, 132, 0.12);
  font-size: 0.78rem;
  font-weight: 800;
}

.service-editor-field {
  border-radius: 16px;
  background: linear-gradient(180deg, #fbfdff 0%, #f4f9ff 100%);
  border: 1px solid rgba(20, 49, 95, 0.1);
  color: #142338;
}

.service-editor-field::placeholder {
  color: #8aa0bc;
}

.service-price-input-wrap {
  position: relative;
}

.service-price-suffix {
  position: absolute;
  top: 50%;
  right: 1.05rem;
  transform: translateY(-50%);
  color: #607188;
  font-size: 0.82rem;
  font-weight: 700;
  pointer-events: none;
}

.service-language-preview {
  display: grid;
  gap: 0.7rem;
  border-radius: 22px;
  background:
    radial-gradient(circle at top right, rgba(208, 232, 255, 0.4), transparent 36%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid rgba(20, 49, 95, 0.07);
  padding: 1rem;
}

.service-language-preview-head h4 {
  font-size: 0.96rem;
  font-weight: 800;
  color: #17345f;
}

.service-language-preview-head p {
  margin-top: 0.2rem;
  color: #68809e;
  font-size: 0.82rem;
  line-height: 1.45;
}

.service-language-preview-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.8rem;
  border-radius: 16px;
  padding: 0.72rem 0.8rem;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(20, 49, 95, 0.06);
}

.service-language-preview-row span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  color: #204876;
  background: #eaf4ff;
  border-radius: 10px;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.service-language-preview-row strong {
  color: #14315f;
  font-size: 0.92rem;
}

.service-language-preview-row em {
  font-style: normal;
  color: #5f7794;
  font-size: 0.8rem;
  font-weight: 700;
  text-align: right;
}

.service-products-toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.2rem 0;
}

.service-search-field {
  flex: 1;
}

.service-selected-pill {
  flex-shrink: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #eff7ff 0%, #e6f2ff 100%);
  color: #14315f;
  border: 1px solid rgba(20, 49, 95, 0.1);
  padding: 0.65rem 0.85rem;
  font-size: 0.84rem;
  font-weight: 700;
}

.service-products-list {
  display: grid;
  gap: 0.65rem;
  max-height: 372px;
  overflow: auto;
  padding: 0.2rem 0.3rem 0.2rem 0;
}

.service-product-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  border-radius: 18px;
  background: linear-gradient(180deg, #fbfdff 0%, #f5faff 100%);
  border: 1px solid rgba(20, 49, 95, 0.06);
  padding: 0.9rem 0.95rem;
  color: #14315f;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.service-product-item:hover {
  transform: translateY(-2px);
  background: #f1f7ff;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.service-product-item-active {
  border-color: rgba(68, 154, 238, 0.24);
  background:
    linear-gradient(180deg, rgba(234, 244, 255, 0.96) 0%, rgba(244, 249, 255, 0.96) 100%);
  box-shadow: 0 16px 30px rgba(20, 79, 149, 0.08);
}

.service-product-copy {
  display: grid;
  gap: 0.25rem;
}

.service-product-copy strong {
  color: #14315f;
  font-size: 0.92rem;
}

.service-product-copy span {
  color: #607188;
  font-size: 0.84rem;
  line-height: 1.45;
}

.service-empty-state {
  border-radius: 18px;
  border: 1px dashed rgba(20, 49, 95, 0.16);
  padding: 1.1rem;
  text-align: center;
  color: #607188;
  background: #f9fbfe;
}

.service-selection-note {
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: linear-gradient(180deg, #f8fbff 0%, #eff6ff 100%);
  border: 1px solid rgba(20, 49, 95, 0.08);
  color: #5a728f;
  font-size: 0.84rem;
  line-height: 1.55;
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
  padding: 1rem 1.35rem 1.35rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.98) 34%);
  flex-wrap: wrap;
}

.service-modal-action-btn {
  min-width: 148px;
}

.service-modal-actions .editor-secondary-btn {
  background: #eef3f8;
  color: #28405c;
  border: 1px solid rgba(20, 49, 95, 0.08);
  box-shadow: none;
}

.service-modal-actions .products-create-btn {
  min-width: 148px;
  background: linear-gradient(135deg, #1f8f5f, #157347);
  color: #ffffff;
  box-shadow: 0 16px 28px rgba(21, 115, 71, 0.22);
}

.service-modal-actions .products-create-btn:hover {
  box-shadow: 0 20px 34px rgba(21, 115, 71, 0.28);
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

  .service-modal-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .service-products-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .service-lang-switch {
    grid-template-columns: 1fr;
  }

  .service-language-preview-row {
    grid-template-columns: 44px minmax(0, 1fr);
  }

  .service-language-preview-row em {
    grid-column: 2;
    text-align: left;
  }
}

@media (max-width: 640px) {
  .service-editor-modal {
    width: min(100vw - 1rem, 1080px);
    max-height: 94vh;
    border-radius: 24px;
  }

  .service-modal-hero,
  .service-modal-header,
  .service-lang-switch-wrap,
  .service-modal-actions,
  .service-editor-grid {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .service-modal-scroll {
    padding-bottom: 1rem;
  }

  .service-panel-head,
  .service-products-head {
    flex-direction: column;
  }

  .service-form-badge,
  .service-selected-pill {
    width: 100%;
    justify-content: center;
    text-align: center;
  }

  .service-modal-actions {
    justify-content: stretch;
  }

  .service-modal-action-btn {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>
