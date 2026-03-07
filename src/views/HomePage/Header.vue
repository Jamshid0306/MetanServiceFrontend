<script setup>
import { useI18n } from "vue-i18n";
import firstImage from "@/assets/images/1.webp";

const { t } = useI18n();
</script>

<template>
  <div
    id="header"
    class="container mx-auto mb-16 md:mb-24 mt-[72px] select-none"
  >
    <section class="hero-shell">
      <span class="hero-aura hero-aura-left" />
      <span class="hero-aura hero-aura-right" />

      <div class="hero-grid">
        <div class="hero-content reveal-up">
          <p class="hero-kicker">{{ t("products.title") }}</p>

          <h1 class="hero-title">
            <span>{{ t("header.service.title") }}</span>
            <span>{{ t("header.support.title") }}</span>
          </h1>

          <p class="hero-subtitle">
            {{ t("header.service.text") }}
          </p>

          <div class="hero-actions">
            <RouterLink :to="{ name: 'Products' }" class="hero-btn hero-btn-primary">
              {{ t("products.allProducts") }}
            </RouterLink>
            <RouterLink :to="{ path: '/', hash: '#contact' }" class="hero-btn hero-btn-ghost">
              {{ t("nav.contact") }}
            </RouterLink>
          </div>

          <div class="hero-cards">
            <RouterLink :to="{ name: 'Products' }" class="hero-info-card">
              <h3>{{ t("header.support.title-short") }}</h3>
              <p>{{ t("header.support.text") }}</p>
            </RouterLink>

            <RouterLink :to="{ name: 'Products' }" class="hero-info-card">
              <h3>{{ t("header.service.title") }}</h3>
              <p>{{ t("header.more") }}</p>
            </RouterLink>
          </div>
        </div>

        <div class="hero-visual reveal-right">
          <div class="hero-image-wrap">
            <img :src="firstImage" alt="Hero image" class="hero-image" />
            <div class="hero-image-overlay" />
          </div>

          <div class="hero-badge badge-top">
            {{ t("header.support.title-short") }}
          </div>
          <div class="hero-badge badge-bottom">
            {{ t("header.service.title") }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-shell {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(20, 54, 108, 0.13);
  background: linear-gradient(155deg, rgba(255, 255, 255, 0.98), rgba(244, 248, 255, 0.96));
  box-shadow: 0 18px 36px rgba(8, 30, 72, 0.1);
  padding: 1.05rem;
}

.hero-aura {
  position: absolute;
  border-radius: 999px;
  filter: blur(52px);
  opacity: 0.2;
  pointer-events: none;
  animation: auraMove 20s ease-in-out infinite;
}

.hero-aura-left {
  width: 220px;
  height: 220px;
  left: -70px;
  top: -55px;
  background: rgba(26, 79, 149, 0.3);
}

.hero-aura-right {
  width: 250px;
  height: 250px;
  right: -80px;
  bottom: -80px;
  background: rgba(62, 143, 218, 0.25);
  animation-delay: 2s;
}

.hero-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 1rem;
}

.hero-content {
  border-radius: 18px;
  border: 1px solid rgba(20, 54, 108, 0.1);
  background: rgba(255, 255, 255, 0.9);
  padding: clamp(1.1rem, 2vw, 1.8rem);
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(20, 62, 122, 0.1);
  color: #133f7e;
  padding: 0.36rem 0.75rem;
  font-weight: 700;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-title {
  margin-top: 0.8rem;
  color: #122f62;
  font-weight: 800;
  line-height: 1.1;
  font-size: clamp(1.55rem, 2.8vw, 2.9rem);
}

.hero-title span {
  display: block;
}

.hero-subtitle {
  margin-top: 0.8rem;
  max-width: 60ch;
  color: #3b5480;
  line-height: 1.65;
  font-size: clamp(0.93rem, 1.3vw, 1.03rem);
}

.hero-actions {
  margin-top: 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.hero-btn {
  border-radius: 11px;
  padding: 0.64rem 0.96rem;
  font-weight: 700;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.hero-btn:hover {
  transform: translateY(-1px);
}

.hero-btn-primary {
  background: #143d7a;
  color: #fff;
  border: 1px solid rgba(20, 54, 108, 0.15);
  box-shadow: 0 10px 20px rgba(8, 30, 72, 0.22);
}

.hero-btn-primary:hover {
  background: #0f2f61;
  box-shadow: 0 13px 22px rgba(8, 30, 72, 0.28);
}

.hero-btn-ghost {
  border: 1px solid rgba(20, 54, 108, 0.2);
  color: #173d76;
  background: #ffffff;
}

.hero-btn-ghost:hover {
  box-shadow: 0 8px 18px rgba(8, 30, 72, 0.12);
}

.hero-cards {
  margin-top: 1.1rem;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.hero-info-card {
  border-radius: 14px;
  border: 1px solid rgba(20, 54, 108, 0.14);
  background: rgba(255, 255, 255, 0.95);
  padding: 0.82rem 0.86rem;
  transition:
    transform 0.24s ease,
    box-shadow 0.24s ease;
}

.hero-info-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 20px rgba(8, 30, 72, 0.1);
}

.hero-info-card h3 {
  color: #173d76;
  font-size: 0.88rem;
  font-weight: 800;
}

.hero-info-card p {
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: #4f6791;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.hero-visual {
  position: relative;
}

.hero-image-wrap {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(20, 54, 108, 0.16);
  min-height: 380px;
  height: 100%;
  box-shadow: 0 16px 28px rgba(8, 30, 72, 0.18);
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.01);
}

.hero-image-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 18%, rgba(14, 43, 102, 0.26), transparent 36%),
    linear-gradient(to top, rgba(12, 40, 91, 0.32), transparent 45%);
}

.hero-badge {
  position: absolute;
  border-radius: 10px;
  border: 1px solid rgba(20, 54, 108, 0.2);
  background: rgba(255, 255, 255, 0.9);
  color: #1a437e;
  padding: 0.55rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.badge-top {
  left: 0.85rem;
  top: 0.85rem;
}

.badge-bottom {
  right: 0.85rem;
  bottom: 0.85rem;
}

.reveal-up {
  animation: riseIn 0.6s ease-out both;
}

.reveal-right {
  animation: slideIn 0.68s ease-out both;
}

@keyframes riseIn {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes auraMove {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }
  50% {
    transform: translate3d(8px, -8px, 0);
  }
}

@media (max-width: 1100px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .hero-image-wrap {
    min-height: 300px;
  }
}

@media (max-width: 700px) {
  .hero-shell {
    border-radius: 20px;
    padding: 0.78rem;
  }

  .hero-content {
    border-radius: 16px;
  }

  .hero-cards {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 1.45rem;
  }

  .hero-image-wrap {
    min-height: 255px;
    border-radius: 14px;
  }

  .hero-badge {
    font-size: 0.7rem;
    padding: 0.45rem 0.62rem;
  }
}
</style>
