<template>
  <footer id="site-footer" class="footer-shell relative overflow-hidden pt-16 pb-8">
    <div class="container mx-auto px-6 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-12 footer-card animate-fade-in-up">
          <h2 class="footer-title">{{ t("footer.contacts") }}</h2>

          <p class="footer-contact-subtitle">{{ t("contact_title") }}</p>

          <div class="footer-contacts-list">
            <a :href="CONTACT_PHONE_HREF" class="footer-contact-row">
              <span class="footer-contact-icon footer-contact-icon-phone" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19.95 21q-3.125 0-6.175-1.35t-5.475-3.775t-3.775-5.475T3.175 4.225q0-.45.3-.75t.75-.3H8.1q.375 0 .688.25t.387.625l.6 2.725q.075.4-.025.675t-.35.525L7.05 10.3q.575 1.025 1.313 1.95T10 14q.825.825 1.75 1.563t1.95 1.312l2.325-2.35q.25-.25.55-.338t.625-.012l2.7.55q.4.075.65.388t.25.687v3.875q0 .45-.3.75t-.75.3"
                  />
                </svg>
              </span>
              <span class="footer-contact-meta">
                <strong class="footer-contact-label">{{ t("phone") }}</strong>
                <small class="footer-contact-value">{{ CONTACT_PHONE_DISPLAY }}</small>
              </span>
            </a>

            <a
              :href="CONTACT_TELEGRAM_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="footer-contact-row"
            >
              <span class="footer-contact-icon footer-contact-icon-tg" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.23-.447-1.923-.875-1.09-.718-1.7-1.165-2.75-1.866-1.21-.82-1.42-1.005-1.45-1.44-.02-.32.08-.517.45-.735 1.14-.68 7.87-4.9 8.1-5.3.05-.1.07-.2-.04-.28-.1-.1-.24-.07-.36-.04-.16.04-2.65 1.7-7.48 4.9z"
                  />
                </svg>
              </span>
              <span class="footer-contact-meta">
                <strong class="footer-contact-label">{{ t("footer.telegram") }}</strong>
                <small class="footer-contact-value">{{ CONTACT_TELEGRAM_HANDLE }}</small>
              </span>
            </a>

            <a
              :href="CONTACT_INSTAGRAM_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="footer-contact-row"
            >
              <span class="footer-contact-icon footer-contact-icon-inst" aria-hidden="true">
                <InstagramIcon />
              </span>
              <span class="footer-contact-meta">
                <strong class="footer-contact-label">Instagram</strong>
                <small class="footer-contact-value">{{ CONTACT_INSTAGRAM_HANDLE }}</small>
              </span>
            </a>

            <a
              :href="CONTACT_MAP_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="footer-contact-row"
            >
              <span class="footer-contact-icon footer-contact-icon-map" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 22q-.425 0-.712-.288T11 21q0-.125.075-.425t.2-.7t.287-.85t.338-.925q-2.5-.225-4.2-2.062T6 11.8q0-2.5 1.75-4.15T12 6q2.5 0 4.25 1.65T18 11.8q0 1.875-.9 3.438T14.725 17.7q.15.35.3.725t.275.725t.2.65T15.6 20q0 .425-.288.713T14.6 21q-.25 0-.463-.137t-.337-.363q-.625-1.35-.987-2.175t-.813-1.825q-.45 1-.813 1.825t-.987 2.175q-.125.225-.338.363T9.4 21q-.425 0-.712-.287T8.4 20q0-.1.1-.412t.25-.738t.325-.85t.325-.725q-1.5-.75-2.45-2.137T6 11.8Q6 9.3 7.75 7.65T12 6q2.5 0 4.25 1.65T18 11.8q0 2.238-1.387 3.987T13 18.1q.175.45.338.925t.287.85t.2.7t.075.425q0 .425-.287.713T13 22z"
                  />
                </svg>
              </span>
              <span class="footer-contact-meta">
                <strong class="footer-contact-label">{{ t("footer.contact") }}</strong>
                <small class="footer-contact-value">{{ t("footer.address") }}</small>
              </span>
            </a>


          </div>

          <div class="footer-map-wrap" aria-label="Google Maps">
            <iframe
              :src="CONTACT_MAP_EMBED_URL"
              class="footer-map-frame"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            />
          </div>
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
import InstagramIcon from "./icons/InstagramIcon.vue";
import {
  CONTACT_INSTAGRAM_HANDLE,
  CONTACT_INSTAGRAM_URL,
  CONTACT_MAP_EMBED_URL,
  CONTACT_MAP_URL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_HREF,
  CONTACT_TELEGRAM_HANDLE,
  CONTACT_TELEGRAM_URL,
} from "@/constants/contact";
const { t } = useI18n();
</script>

<style scoped>
.footer-shell {
  background: linear-gradient(180deg, #141d2a 0%, #182433 100%);
  color: #d7e0ea;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.footer-card {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 24px;
}

.footer-logo {
  width: 190px;
  max-width: 100%;
  border-radius: 12px;
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 8px 12px;
  font-size: 0.83rem;
  color: #edf3ff;
  background: rgba(255, 255, 255, 0.02);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.footer-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

.footer-title {
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #ffffff;
  margin-bottom: 16px;
}

.footer-contact-subtitle {
  margin-top: -4px;
  color: rgba(231, 238, 247, 0.86);
  line-height: 1.6;
  font-size: 0.95rem;
}

.footer-contacts-list {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.footer-contact-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.footer-contact-row:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
}

.footer-contact-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: #e7eeff;
  flex-shrink: 0;
}

.footer-contact-icon-phone {
  background: rgba(79, 70, 229, 0.12);
}

.footer-contact-icon-inst {
  background: rgba(232, 121, 249, 0.12);
}

.footer-contact-icon-map {
  background: rgba(16, 185, 129, 0.12);
}

.footer-contact-icon-tg {
  background: rgba(34, 158, 217, 0.14);
  color: #7dd3fc;
}

.footer-contact-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.footer-contact-label {
  font-size: 0.82rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.2;
}

.footer-contact-value {
  margin-top: 2px;
  font-size: 0.75rem;
  color: rgba(231, 238, 247, 0.72);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.footer-map-wrap {
  margin-top: 16px;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  height: 320px;
}

.footer-map-frame {
  width: 100%;
  height: 100%;
  border: 0;
}

@media (max-width: 640px) {
  .footer-map-wrap {
    height: 260px;
  }
}

.footer-link {
  position: relative;
  color: rgba(231, 238, 247, 0.78);
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
  background: rgba(231, 238, 247, 0.48);
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
  color: rgba(231, 238, 247, 0.82);
  transition: color 0.2s ease;
}

.footer-contact:hover {
  color: #fff;
  text-decoration: underline;
}

.footer-bottom {
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.edev-link {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 12px 6px 6px;
  color: #e7eeff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.edev-link:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
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

</style>
