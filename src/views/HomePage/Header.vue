<script setup>
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import firstImage from "@/assets/images/1.webp";
import serviceImage from "@/assets/images/service.jpg";
import supportImage from "@/assets/images/support.jpg";
import "swiper/css";
import "swiper/css/pagination";

const heroSlides = [
  {
    src: firstImage,
    alt: "Metan uskunalari",
  },
  {
    src: serviceImage,
    alt: "Servis ishlari",
  },
  {
    src: supportImage,
    alt: "Texnik qo‘llab-quvvatlash",
  },
];
</script>

<template>
  <div
    id="header"
    class="container mx-auto mb-16 md:mb-24 mt-[72px] select-none"
  >
    <section class="hero-shell">
      <span class="hero-aura hero-aura-left" />
      <span class="hero-aura hero-aura-right" />

      <Swiper
        :modules="[Autoplay, Pagination]"
        :loop="true"
        :speed="850"
        :autoplay="{ delay: 3200, disableOnInteraction: false }"
        :pagination="{ clickable: true }"
        class="hero-swiper reveal-up"
      >
        <SwiperSlide
          v-for="slide in heroSlides"
          :key="slide.src"
          class="hero-slide"
        >
          <img :src="slide.src" :alt="slide.alt" class="hero-image" />
        </SwiperSlide>
      </Swiper>
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

.hero-swiper {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
  margin: 0 auto;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(20, 54, 108, 0.16);
  box-shadow: 0 16px 28px rgba(8, 30, 72, 0.18);
}

.hero-slide {
  position: relative;
  aspect-ratio: 16 / 5;
  min-height: 220px;
}

.hero-slide::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 14% 18%, rgba(14, 43, 102, 0.15), transparent 34%),
    linear-gradient(to top, rgba(12, 40, 91, 0.18), transparent 44%);
  pointer-events: none;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1.015);
}

.reveal-up {
  animation: riseIn 0.6s ease-out both;
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
  .hero-slide {
    min-height: 190px;
  }
}

@media (max-width: 700px) {
  .hero-shell {
    border-radius: 20px;
    padding: 0.78rem;
  }

  .hero-swiper {
    border-radius: 14px;
  }

  .hero-slide {
    min-height: 150px;
  }
}

:deep(.hero-swiper .swiper-pagination) {
  bottom: 10px;
}

:deep(.hero-swiper .swiper-pagination-bullet) {
  width: 8px;
  height: 8px;
  background: rgba(255, 255, 255, 0.8);
  opacity: 0.72;
}

:deep(.hero-swiper .swiper-pagination-bullet-active) {
  width: 24px;
  border-radius: 999px;
  background: #ffffff;
  opacity: 1;
}
</style>
