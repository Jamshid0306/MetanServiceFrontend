<template>
  <footer id="site-footer" class="footer-shell relative overflow-hidden pt-16 pb-8">
    <span class="footer-aura footer-aura-left" />
    <span class="footer-aura footer-aura-right" />

    <div class="container mx-auto px-6 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 footer-card animate-fade-in-up">
          <img
            src="@/assets/images/logo.jpg"
            :alt="t('footer.logoAlt')"
            class="footer-logo"
          />
          <p class="footer-description">
            {{ t("footer.description") }}
          </p>

          <div class="footer-chip-row">
            <a href="tel:+998777031345" class="footer-chip">+998 77 703 13 45</a>
            <a href="mailto:info@urganchmetanservice.uz" class="footer-chip">info@urganchmetanservice.uz</a>
          </div>
        </div>

        <div class="lg:col-span-3 footer-card animate-fade-in-up animation-delay-200">
          <h2 class="footer-title">{{ t("footer.quickLinks") }}</h2>
          <div class="space-y-2.5 flex flex-col">
            <RouterLink
              :to="{ path: '/', hash: '#header' }"
              class="footer-link"
            >
              {{ t("nav.main") }}
            </RouterLink>
            <RouterLink
              :to="{ path: '/', hash: '#contact' }"
              class="footer-link"
            >
              {{ t("nav.contact") }}
            </RouterLink>
            <RouterLink
              :to="{ name: 'Products' }"
              class="footer-link"
            >
              {{ t("products.allProducts") }}
            </RouterLink>
          </div>
        </div>

        <div class="lg:col-span-4 footer-card animate-fade-in-up animation-delay-400">
          <h2 class="footer-title">{{ t("footer.contact") }}</h2>
          <ul class="space-y-3">
            <li>
              <a
                href="https://yandex.uz/map-widget/v1/-/CLUinOK8"
                target="_blank"
                class="footer-contact"
              >
                {{ t("footer.address") }}
              </a>
            </li>
            <li>
              <a href="tel:+998777031345" class="footer-contact">
                +998 77 703 13 45
              </a>
            </li>
            <li>
              <a href="mailto:info@urganchmetanservice.uz" class="footer-contact">
                info@urganchmetanservice.uz
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="text-sm text-white/90">
          &copy; {{ new Date().getFullYear() }} {{ t("footer.rights") }}
        </p>

        <a target="_blank" href="https://edev.uz" class="edev-link">
          <img
            class="rounded-xl w-8 h-8"
            src="@/assets/images/edev-icon.ico"
            alt="Edev"
          />
          {{ t("creat") }}
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
</script>

<style scoped>
.footer-shell {
  background: linear-gradient(155deg, #0a1f47 0%, #103263 52%, #12376d 100%);
  color: #dbe4ff;
}

.footer-aura {
  position: absolute;
  border-radius: 999px;
  filter: blur(56px);
  opacity: 0.3;
  pointer-events: none;
  animation: aura-drift 18s ease-in-out infinite;
}

.footer-aura-left {
  width: 280px;
  height: 280px;
  left: -100px;
  top: -80px;
  background: rgba(44, 106, 191, 0.56);
}

.footer-aura-right {
  width: 250px;
  height: 250px;
  right: -80px;
  bottom: -70px;
  background: rgba(62, 143, 218, 0.48);
  animation-delay: 2.5s;
}

.footer-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 16px 30px rgba(4, 18, 45, 0.28);
  backdrop-filter: blur(8px);
  padding: 24px;
}

.footer-logo {
  width: 190px;
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(4, 18, 45, 0.34);
}

.footer-description {
  margin-top: 14px;
  font-size: 0.94rem;
  line-height: 1.6;
  color: rgba(235, 242, 255, 0.86);
}

.footer-chip-row {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.footer-chip {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 8px 12px;
  font-size: 0.83rem;
  color: #edf3ff;
  background: rgba(255, 255, 255, 0.05);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.footer-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.12);
}

.footer-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  margin-bottom: 16px;
}

.footer-link {
  position: relative;
  color: rgba(238, 242, 255, 0.82);
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.footer-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -3px;
  width: 100%;
  height: 1px;
  background: rgba(220, 231, 255, 0.65);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 0.25s ease;
}

.footer-link:hover {
  color: #fff;
  transform: translateX(2px);
}

.footer-link:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}

.footer-contact {
  color: rgba(238, 242, 255, 0.87);
  transition: color 0.2s ease;
}

.footer-contact:hover {
  color: #fff;
  text-decoration: underline;
}

.footer-bottom {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.edev-link {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  padding: 6px 12px 6px 6px;
  color: #e7eeff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.edev-link:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
}

.animation-delay-200 {
  animation-delay: 0.2s;
}
.animation-delay-400 {
  animation-delay: 0.4s;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-up {
  animation: fade-in-up 0.8s ease-out forwards;
}

@keyframes aura-drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(20px, -16px, 0);
  }
}
</style>
