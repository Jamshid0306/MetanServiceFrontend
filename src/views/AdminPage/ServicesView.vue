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
          <div class="editor-header">
            <div>
              <p class="editor-eyebrow">
                {{ isUpdate ? "Редактирование" : "Новая услуга" }}
              </p>
              <h2 class="editor-title">
                {{ isUpdate ? "Обновить услугу" : "Добавить услугу" }}
              </h2>
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
            <div class="editor-panel">
              <label class="editor-label">
                Название
                <input
                  v-model="serviceForm.name[currentLang]"
                  type="text"
                  class="editor-field"
                />
              </label>

              <label class="editor-label">
                Характеристика
                <textarea
                  v-model="serviceForm.characteristic[currentLang]"
                  rows="5"
                  class="editor-field editor-textarea"
                ></textarea>
              </label>

              <label class="editor-label">
                Цена
                <input
                  :value="serviceForm.price[currentLang]"
                  type="text"
                  class="editor-field"
                  @input="serviceForm.price[currentLang] = formatNumericInput($event.target.value)"
                />
              </label>
            </div>

            <div class="editor-panel">
              <div class="editor-section-head">
                <div>
                  <h3 class="editor-section-title">Связанные товары</h3>
                  <p class="editor-section-copy">
                    Отметьте товары, где эта услуга должна отображаться у клиента.
                  </p>
                </div>
              </div>

              <div class="service-products-list">
                <label
                  v-for="product in products"
                  :key="product.id"
                  class="service-product-item"
                >
                  <input
                    type="checkbox"
                    :checked="serviceForm.product_ids.includes(product.id)"
                    @change="toggleProduct(product.id)"
                  />
                  <span>#{{ product.id }} {{ product.name_ru }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="editor-actions">
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
}

.service-editor-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
}

.editor-label {
  display: grid;
  gap: 0.45rem;
  color: #dbe7fb;
  font-size: 0.92rem;
  font-weight: 700;
}

.service-products-list {
  margin-top: 1rem;
  display: grid;
  gap: 0.65rem;
  max-height: 360px;
  overflow: auto;
}

.service-product-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.75rem 0.85rem;
  color: #ecf3ff;
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

@media (max-width: 900px) {
  .service-editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
