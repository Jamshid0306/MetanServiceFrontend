<script setup>
import { useRoute } from "vue-router";
import Nav from "./components/Nav.vue";
import Loader from "./components/Loader.vue";
import { useLoaderStore } from "./store/loaderStore";
import { onMounted, ref, watch } from "vue";
import FaceBookIcon from "./components/icons/FaceBookIcon.vue";
import InstagramIcon from "./components/icons/InstagramIcon.vue";
import Footer from "./components/Footer.vue";

const route = useRoute();
const expanded = ref(false);
const loaderStore = useLoaderStore();
onMounted(() => {
  loaderStore.loader = true;
});
const toggleExpand = () => {
  expanded.value = !expanded.value;
};

watch(
  () => route.fullPath,
  () => {
    expanded.value = false;
  }
);
</script>

<template>
  <div>
    <Nav v-if="route.path !== '/admin'" />
    <RouterView />
    <Footer v-if="route.path !== '/admin'" />
    <Loader v-if="loaderStore.loader" />

    <div v-if="route.path !== '/admin'" class="quick-contact">
      <transition name="contact-panel">
        <div v-if="expanded" class="contact-panel">
          <p class="contact-panel-title">Urganch Metan Service</p>
          <p class="contact-panel-subtitle">Support xizmati</p>

          <a
            href="https://t.me/metanservice"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-tg">
              <FaceBookIcon />
            </span>
            <span class="contact-link-text">
              <strong>Telegram</strong>
              <small>Official channel</small>
            </span>
          </a>

          <a
            href="https://www.instagram.com/metanservice/"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-inst">
              <InstagramIcon />
            </span>
            <span class="contact-link-text">
              <strong>Instagram</strong>
              <small>Official page</small>
            </span>
          </a>

          <a
            href="https://www.facebook.com/profile.php?id=61579837593638"
            target="_blank"
            rel="noopener noreferrer"
            class="contact-link"
          >
            <span class="contact-link-icon contact-link-icon-fb">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
              >
                <path
                  fill="currentColor"
                  d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396z"
                />
              </svg>
            </span>
            <span class="contact-link-text">
              <strong>Facebook</strong>
              <small>Official page</small>
            </span>
          </a>
        </div>
      </transition>

      <button
        @click="toggleExpand"
        :aria-expanded="expanded"
        aria-label="Toggle quick contacts"
        class="quick-toggle"
      >
        <span class="quick-toggle-icon">
          <svg
            v-if="!expanded"
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M12 2a10 10 0 1 0 10 10A10.01 10.01 0 0 0 12 2m5.56 7.16l-1.5 7.08a1.18 1.18 0 0 1-1.74.8l-2.41-1.77l-1.17 1.14c-.13.13-.23.23-.48.23l.17-2.43l4.43-4c.19-.17-.04-.27-.29-.1l-5.47 3.45l-2.36-.74c-.51-.16-.52-.51.11-.76l9.24-3.56c.42-.19.82.1.67.66"
            />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="m8.382 17.025l-1.407-1.4L10.593 12L6.975 8.4L8.382 7L12 10.615L15.593 7L17 8.4L13.382 12L17 15.625l-1.407 1.4L12 13.41z"
            />
          </svg>
        </span>
        <span class="quick-toggle-text">{{ expanded ? "Close" : "Contact" }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.quick-contact {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.65rem;
}

.quick-toggle {
  border: 1px solid rgba(24, 79, 149, 0.26);
  background: linear-gradient(135deg, #0f2b66, #1a4f95 68%);
  color: #ffffff;
  border-radius: 999px;
  min-width: 128px;
  height: 3rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 12px 24px rgba(6, 24, 58, 0.28);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.quick-toggle:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 26px rgba(6, 24, 58, 0.32);
  filter: brightness(1.03);
}

.quick-toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.quick-toggle-text {
  letter-spacing: 0.01em;
}

.contact-panel {
  width: min(280px, calc(100vw - 2.5rem));
  border-radius: 18px;
  border: 1px solid rgba(24, 79, 149, 0.22);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(8px);
  box-shadow: 0 20px 34px rgba(6, 24, 58, 0.22);
  padding: 0.82rem;
}

.contact-panel-title {
  color: #122d61;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.contact-panel-subtitle {
  margin-top: 0.22rem;
  margin-bottom: 0.72rem;
  color: #4f6f9f;
  font-size: 0.76rem;
  font-weight: 600;
}

.contact-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  border-radius: 12px;
  padding: 0.48rem;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.contact-link + .contact-link {
  margin-top: 0.25rem;
}

.contact-link:hover {
  background: rgba(15, 43, 102, 0.06);
  transform: translateX(1px);
}

.contact-link-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.contact-link-icon-tg {
  background: linear-gradient(135deg, #1f5ca5, #347fca);
}

.contact-link-icon-inst {
  background: linear-gradient(135deg, #2e4f96, #4d7acd);
}

.contact-link-icon-fb {
  background: linear-gradient(135deg, #153d7c, #2158a7);
}

.contact-link-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  color: #102c5b;
}

.contact-link-text strong {
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.2;
}

.contact-link-text small {
  margin-top: 1px;
  font-size: 0.72rem;
  color: #5470a1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contact-panel-enter-active,
.contact-panel-leave-active {
  transition: all 0.25s ease;
}

.contact-panel-enter-from,
.contact-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

@media (max-width: 640px) {
  .quick-contact {
    right: 0.9rem;
    bottom: 0.9rem;
  }

  .quick-toggle {
    min-width: 112px;
    height: 2.85rem;
    font-size: 0.84rem;
  }
}
</style>
