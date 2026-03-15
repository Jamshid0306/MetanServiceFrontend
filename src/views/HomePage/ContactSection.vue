<script setup>
import { useI18n } from "vue-i18n";
import {
  CONTACT_INSTAGRAM_HANDLE,
  CONTACT_INSTAGRAM_URL,
  CONTACT_MAP_EMBED_URL,
  CONTACT_MAP_LABEL,
  CONTACT_MAP_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
} from "@/constants/contact";

const { t } = useI18n();
</script>

<template>
  <section id="contact" class="contact-section py-14 md:py-20">
    <div class="container mx-auto px-4">
      <div class="contact-shell">
        <div class="contact-content reveal-up">
          <p class="contact-kicker">{{ t("nav.contact") }}</p>
          <h2 class="contact-title">{{ t("contact_title") }}</h2>
          <p class="contact-address">{{ t("footer.address") }}</p>

          <div class="contact-cards">
            <a :href="CONTACT_PHONE_HREF" class="contact-card">
              <span class="contact-label">{{ t("phone") }}</span>
              <span class="contact-value">{{ CONTACT_PHONE_DISPLAY }}</span>
            </a>

            <a :href="CONTACT_INSTAGRAM_URL" target="_blank" rel="noopener noreferrer" class="contact-card">
              <span class="contact-label">Instagram</span>
              <span class="contact-value">{{ CONTACT_INSTAGRAM_HANDLE }}</span>
            </a>

            <a :href="CONTACT_MAP_URL" target="_blank" rel="noopener noreferrer" class="contact-card">
              <span class="contact-label">{{ t("footer.contact") }}</span>
              <span class="contact-value">{{ t("footer.address") }}</span>
            </a>

            <a :href="CONTACT_MAP_URL" target="_blank" rel="noopener noreferrer" class="contact-card">
              <span class="contact-label">Google Maps</span>
              <span class="contact-value">{{ CONTACT_MAP_LABEL }}</span>
            </a>
          </div>
        </div>

        <div class="map-wrap reveal-right">
          <iframe
            :src="CONTACT_MAP_EMBED_URL"
            class="map-frame"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            allowfullscreen
          />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.contact-section {
  background: transparent;
}

.contact-shell {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 1rem;
  border-radius: 24px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(8px);
  padding: clamp(0.9rem, 1.7vw, 1.2rem);
}

.contact-content {
  border-radius: 18px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: rgba(255, 255, 255, 0.98);
  padding: clamp(1rem, 2vw, 1.55rem);
}

.contact-kicker {
  display: inline-flex;
  border-radius: 999px;
  background: rgba(20, 35, 56, 0.06);
  color: #41536f;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.34rem 0.72rem;
}

.contact-title {
  margin-top: 0.72rem;
  color: #142338;
  font-weight: 800;
  line-height: 1.18;
  font-size: clamp(1.2rem, 2vw, 1.9rem);
}

.contact-address {
  margin-top: 0.56rem;
  color: #64748b;
  line-height: 1.6;
  font-size: 0.95rem;
}

.contact-cards {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.contact-card {
  border-radius: 12px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: #ffffff;
  padding: 0.72rem 0.78rem;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

.contact-card:hover {
  transform: translateY(-1px);
  border-color: rgba(20, 35, 56, 0.18);
}

.contact-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #64748b;
}

.contact-value {
  display: block;
  margin-top: 0.24rem;
  font-size: 0.9rem;
  line-height: 1.45;
  color: #142338;
  font-weight: 700;
}

.map-wrap {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(20, 35, 56, 0.1);
  min-height: 360px;
  background: #ffffff;
}

.map-frame {
  width: 100%;
  height: 100%;
  min-height: 360px;
  border: 0;
}

.reveal-up {
  animation: riseIn 0.72s ease-out both;
}

.reveal-right {
  animation: slideIn 0.82s ease-out both;
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@media (max-width: 980px) {
  .contact-shell {
    grid-template-columns: 1fr;
  }

  .map-wrap,
  .map-frame {
    min-height: 280px;
  }
}

@media (max-width: 640px) {
  .contact-cards {
    grid-template-columns: 1fr;
  }
}
</style>
