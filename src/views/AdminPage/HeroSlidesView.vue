<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";

import { resolveAssetUrl } from "@/lib/api";
import { useAdminStore } from "@/store/adminStore";

const store = useAdminStore();
const loading = ref(false);
const saving = ref(false);
const statusMessage = ref("");
const statusType = ref("success");
const editingSlideId = ref(null);
const isModalOpen = ref(false);
const previousBodyOverflow = ref("");

const createForm = reactive({
  durationDays: "5",
  file: null,
  preview: "",
});

const editForm = reactive({
  durationDays: "5",
  file: null,
  preview: "",
});

const heroSlides = computed(() => store.heroSlides);

const revokePreview = (preview) => {
  if (preview && preview.startsWith("blob:")) {
    URL.revokeObjectURL(preview);
  }
};

const setPreview = (form, file, fallback = "") => {
  revokePreview(form.preview);
  form.preview = file ? URL.createObjectURL(file) : fallback;
};

const setStatus = (message, type = "success") => {
  statusMessage.value = message;
  statusType.value = type;
};

const resetCreateForm = () => {
  revokePreview(createForm.preview);
  createForm.durationDays = "5";
  createForm.file = null;
  createForm.preview = "";
};

const resetEditForm = () => {
  revokePreview(editForm.preview);
  editForm.durationDays = "5";
  editForm.file = null;
  editForm.preview = "";
  editingSlideId.value = null;
};

const loadHeroSlides = async () => {
  loading.value = true;
  const isSuccess = await store.getHeroSlides();
  if (!isSuccess && store.lastError) {
    setStatus(store.lastError, "error");
  }
  loading.value = false;
};

const openModal = async () => {
  isModalOpen.value = true;
  await loadHeroSlides();
};

const closeModal = () => {
  isModalOpen.value = false;
  resetEditForm();
};

const handleCreateFileChange = (event) => {
  const file = event.target.files?.[0] || null;
  createForm.file = file;
  setPreview(createForm, file);
};

const handleEditFileChange = (event) => {
  const file = event.target.files?.[0] || null;
  editForm.file = file;
  setPreview(
    editForm,
    file,
    editingSlideId.value
      ? resolveAssetUrl(
          heroSlides.value.find((slide) => slide.id === editingSlideId.value)?.image_path
        )
      : ""
  );
};

const submitCreate = async () => {
  if (!createForm.file) {
    setStatus("Hero banner uchun rasm tanlang.", "error");
    return;
  }

  saving.value = true;
  const formData = new FormData();
  formData.append("file", createForm.file);
  formData.append("duration_days", createForm.durationDays);

  const isSuccess = await store.createHeroSlide(formData);
  if (isSuccess) {
    setStatus("Hero banner qo'shildi.");
    resetCreateForm();
  } else {
    setStatus(store.lastError || "Hero banner qo'shib bo'lmadi.", "error");
  }
  saving.value = false;
};

const startEditing = (slide) => {
  editingSlideId.value = slide.id;
  editForm.durationDays = String(slide.duration_days || 1);
  editForm.file = null;
  setPreview(editForm, null, resolveAssetUrl(slide.image_path));
};

const saveEdit = async (slideId) => {
  saving.value = true;
  const formData = new FormData();
  formData.append("duration_days", editForm.durationDays);
  if (editForm.file) {
    formData.append("file", editForm.file);
  }

  const isSuccess = await store.updateHeroSlide(slideId, formData);
  if (isSuccess) {
    setStatus("Hero banner yangilandi.");
    resetEditForm();
  } else {
    setStatus(store.lastError || "Hero bannerni yangilab bo'lmadi.", "error");
  }
  saving.value = false;
};

const removeSlide = async (slide) => {
  const confirmed = window.confirm("Bu hero bannerni o'chirmoqchimisiz?");
  if (!confirmed) {
    return;
  }

  saving.value = true;
  const isSuccess = await store.deleteHeroSlide(slide.id);
  if (isSuccess) {
    if (editingSlideId.value === slide.id) {
      resetEditForm();
    }
    setStatus("Hero banner o'chirildi.");
  } else {
    setStatus(store.lastError || "Hero bannerni o'chirib bo'lmadi.", "error");
  }
  saving.value = false;
};

const formatDate = (value) => {
  if (!value) {
    return "Noma'lum";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("uz-UZ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const handleEscape = (event) => {
  if (event.key === "Escape" && isModalOpen.value) {
    closeModal();
  }
};

watch(isModalOpen, (isOpen) => {
  if (typeof document === "undefined") {
    return;
  }

  if (isOpen) {
    previousBodyOverflow.value = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return;
  }

  document.body.style.overflow = previousBodyOverflow.value;
});

onMounted(() => {
  window.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  revokePreview(createForm.preview);
  revokePreview(editForm.preview);
  document.body.style.overflow = previousBodyOverflow.value;
  window.removeEventListener("keydown", handleEscape);
});
</script>

<template>
  <section class="hero-admin-launcher">
    <div>
      <p class="hero-admin-kicker">Homepage</p>
      <h2 class="hero-admin-launcher-title">Hero slider boshqaruvi</h2>
      <p class="hero-admin-launcher-copy">
        Swiper banner rasmlarini modal ichida qo'shish, yangilash va o'chirish mumkin.
      </p>
    </div>

    <button type="button" class="hero-admin-open-btn" @click="openModal">
      Swiper rasmlar
    </button>
  </section>

  <transition name="hero-admin-fade">
    <div
      v-if="isModalOpen"
      class="hero-modal-overlay"
      @click.self="closeModal"
    >
      <div class="hero-modal">
        <div class="hero-modal-header">
          <div>
            <p class="hero-admin-kicker">Homepage</p>
            <h2 class="hero-modal-title">Swiper rasmlar</h2>
            <p class="hero-modal-copy">
              Banner rasmlari 300x150 ko‘rinishda chiqadi. Har bir banner ostida qancha kun qolganini ko‘rasiz.
            </p>
          </div>

          <div class="hero-modal-header-actions">
            <button
              type="button"
              class="hero-admin-refresh"
              :disabled="loading || saving"
              @click="loadHeroSlides"
            >
              {{ loading ? "Yuklanmoqda..." : "Yangilash" }}
            </button>
            <button type="button" class="hero-modal-close" @click="closeModal">
              ×
            </button>
          </div>
        </div>

        <div class="hero-modal-body">
          <div class="hero-admin-create">
            <label class="hero-admin-field">
              <span>Rasm</span>
              <input type="file" accept="image/*" @change="handleCreateFileChange" />
            </label>

            <label class="hero-admin-field hero-admin-days">
              <span>Necha kun</span>
              <input v-model="createForm.durationDays" type="number" min="1" step="1" />
            </label>

            <button
              type="button"
              class="hero-admin-submit"
              :disabled="saving"
              @click="submitCreate"
            >
              {{ saving ? "Saqlanmoqda..." : "Banner qo'shish" }}
            </button>
          </div>

          <div v-if="createForm.preview" class="hero-admin-preview">
            <img :src="createForm.preview" alt="Yangi hero banner preview" />
          </div>

          <p
            v-if="statusMessage"
            :class="['hero-admin-status', statusType === 'error' ? 'is-error' : 'is-success']"
          >
            {{ statusMessage }}
          </p>

          <div v-if="!heroSlides.length && !loading" class="hero-admin-empty">
            Hozircha hero banner qo'shilmagan.
          </div>

          <div v-else class="hero-admin-grid">
            <article v-for="slide in heroSlides" :key="slide.id" class="hero-admin-card">
              <img
                :src="resolveAssetUrl(slide.image_path)"
                :alt="`Hero banner ${slide.id}`"
                class="hero-admin-image"
              />

              <p class="hero-admin-remaining">
                Yana {{ slide.remaining_days }} kun qoldi
              </p>

              <div class="hero-admin-meta">
                <div>
                  <p class="hero-admin-meta-label">Tugash sanasi</p>
                  <strong>{{ formatDate(slide.expires_at) }}</strong>
                </div>
                <div>
                  <p class="hero-admin-meta-label">Berilgan muddat</p>
                  <strong>{{ slide.duration_days }} kun</strong>
                </div>
              </div>

              <div v-if="editingSlideId === slide.id" class="hero-admin-editor">
                <label class="hero-admin-field">
                  <span>Yangi rasm</span>
                  <input type="file" accept="image/*" @change="handleEditFileChange" />
                </label>

                <label class="hero-admin-field hero-admin-days">
                  <span>Necha kun</span>
                  <input v-model="editForm.durationDays" type="number" min="1" step="1" />
                </label>

                <div v-if="editForm.preview" class="hero-admin-preview is-inline">
                  <img :src="editForm.preview" alt="Hero banner preview" />
                </div>

                <div class="hero-admin-actions">
                  <button
                    type="button"
                    class="hero-admin-submit"
                    :disabled="saving"
                    @click="saveEdit(slide.id)"
                  >
                    {{ saving ? "Saqlanmoqda..." : "Saqlash" }}
                  </button>
                  <button type="button" class="hero-admin-cancel" @click="resetEditForm">
                    Bekor qilish
                  </button>
                </div>
              </div>

              <div v-else class="hero-admin-actions">
                <button type="button" class="hero-admin-edit" @click="startEditing(slide)">
                  O'zgartirish
                </button>
                <button type="button" class="hero-admin-delete" @click="removeSlide(slide)">
                  O'chirish
                </button>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.hero-admin-launcher {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgba(20, 49, 95, 0.1);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 24px 50px rgba(20, 49, 95, 0.08);
  padding: 1.25rem;
}

.hero-admin-kicker {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6f84a0;
}

.hero-admin-launcher-title,
.hero-modal-title {
  margin-top: 0.3rem;
  font-size: clamp(1.3rem, 2vw, 1.75rem);
  font-weight: 800;
  color: #14315f;
}

.hero-admin-launcher-copy,
.hero-modal-copy {
  margin-top: 0.45rem;
  max-width: 760px;
  color: #536885;
  line-height: 1.6;
}

.hero-admin-open-btn,
.hero-admin-submit,
.hero-admin-edit,
.hero-admin-delete,
.hero-admin-cancel,
.hero-admin-refresh,
.hero-modal-close {
  min-height: 48px;
  border-radius: 16px;
  font-weight: 800;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.hero-admin-open-btn,
.hero-admin-submit,
.hero-admin-refresh {
  background: linear-gradient(135deg, #14315f, #2557a4);
  color: #fff;
  padding: 0 1.2rem;
}

.hero-admin-edit {
  background: rgba(37, 87, 164, 0.12);
  color: #1c4684;
  padding: 0 1rem;
}

.hero-admin-delete {
  background: rgba(188, 34, 60, 0.12);
  color: #9a1d35;
  padding: 0 1rem;
}

.hero-admin-cancel,
.hero-modal-close {
  background: rgba(20, 49, 95, 0.08);
  color: #304968;
  padding: 0 1rem;
}

.hero-admin-open-btn:hover,
.hero-admin-submit:hover,
.hero-admin-edit:hover,
.hero-admin-delete:hover,
.hero-admin-cancel:hover,
.hero-admin-refresh:hover,
.hero-modal-close:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(20, 49, 95, 0.12);
}

.hero-admin-submit:disabled,
.hero-admin-refresh:disabled {
  opacity: 0.7;
  cursor: wait;
}

.hero-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(8, 19, 37, 0.5);
  backdrop-filter: blur(14px);
}

.hero-modal {
  width: min(1320px, 100%);
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background:
    radial-gradient(circle at top right, rgba(37, 87, 164, 0.12), transparent 26%),
    linear-gradient(180deg, rgba(251, 253, 255, 0.98), rgba(242, 246, 251, 0.98));
  box-shadow: 0 32px 90px rgba(6, 20, 43, 0.28);
}

.hero-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.4rem 1.4rem 1.1rem;
  border-bottom: 1px solid rgba(20, 49, 95, 0.08);
}

.hero-modal-header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.hero-modal-close {
  min-width: 48px;
  font-size: 1.6rem;
  line-height: 1;
}

.hero-modal-body {
  overflow-y: auto;
  padding: 1.3rem 1.4rem 1.5rem;
  max-height: calc(100vh - 11rem);
}

.hero-admin-create {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(120px, 180px) auto;
  gap: 0.9rem;
  align-items: end;
}

.hero-admin-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  color: #18304f;
  font-weight: 700;
}

.hero-admin-field span {
  font-size: 0.88rem;
}

.hero-admin-field input {
  min-height: 48px;
  border: 1px solid rgba(20, 49, 95, 0.14);
  border-radius: 16px;
  background: #fff;
  padding: 0.8rem 0.95rem;
  color: #14315f;
}

.hero-admin-preview {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-start;
}

.hero-admin-preview img {
  width: 300px;
  height: 150px;
  max-width: 100%;
  border-radius: 20px;
  border: 1px solid rgba(20, 49, 95, 0.1);
  background: rgba(235, 241, 248, 0.8);
  object-fit: cover;
}

.hero-admin-status {
  margin-top: 1rem;
  border-radius: 16px;
  padding: 0.9rem 1rem;
  font-weight: 700;
}

.hero-admin-status.is-success {
  background: rgba(30, 132, 73, 0.1);
  color: #19613a;
}

.hero-admin-status.is-error {
  background: rgba(188, 34, 60, 0.12);
  color: #8f1c32;
}

.hero-admin-empty {
  margin-top: 1.2rem;
  border: 1px dashed rgba(20, 49, 95, 0.16);
  border-radius: 22px;
  padding: 1.3rem;
  text-align: center;
  color: #617791;
  background: rgba(245, 248, 252, 0.74);
}

.hero-admin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 300px));
  justify-content: center;
  gap: 1rem;
  margin-top: 1.2rem;
}

.hero-admin-card {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: 300px;
  border: 1px solid rgba(20, 49, 95, 0.1);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(246, 249, 252, 0.94));
  padding: 1rem;
}

.hero-admin-image {
  width: 300px;
  height: 150px;
  max-width: 100%;
  border-radius: 18px;
  object-fit: cover;
  background: #e0e8f2;
}

.hero-admin-remaining {
  margin-top: -0.1rem;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 800;
  color: #17427d;
}

.hero-admin-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.hero-admin-meta div {
  border-radius: 16px;
  background: rgba(231, 237, 244, 0.74);
  padding: 0.75rem;
}

.hero-admin-meta-label {
  margin-bottom: 0.2rem;
  font-size: 0.78rem;
  color: #6d8098;
}

.hero-admin-editor {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.hero-admin-actions {
  display: flex;
  gap: 0.7rem;
}

.hero-admin-actions > * {
  flex: 1;
}

.hero-admin-fade-enter-active,
.hero-admin-fade-leave-active {
  transition: opacity 0.22s ease;
}

.hero-admin-fade-enter-from,
.hero-admin-fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .hero-admin-launcher,
  .hero-modal-header {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-admin-create {
    grid-template-columns: 1fr;
  }

  .hero-modal-header-actions {
    justify-content: space-between;
  }
}

@media (max-width: 640px) {
  .hero-admin-launcher {
    padding: 1rem;
    border-radius: 24px;
  }

  .hero-modal {
    border-radius: 24px;
  }

  .hero-modal-body,
  .hero-modal-header {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .hero-admin-grid {
    grid-template-columns: 1fr;
  }

  .hero-admin-card {
    width: 100%;
  }

  .hero-admin-image,
  .hero-admin-preview img {
    width: 100%;
    height: auto;
    aspect-ratio: 2 / 1;
  }

  .hero-admin-meta,
  .hero-admin-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
  }
}
</style>
