<script setup>
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";
import heroProducts from "@/assets/images/hero-products.jpg";
import heroService from "@/assets/images/hero-service.jpg";
import heroSupport from "@/assets/images/hero-support.jpg";
import "swiper/css";
import "swiper/css/pagination";

const heroSlides = [
  {
    src: heroProducts,
    alt: "Metan uskunalari va jihozlari",
  },
  {
    src: heroService,
    alt: "Urganch Metan Service servis ishlari",
  },
  {
    src: heroSupport,
    alt: "Metan tizimlari bo‘yicha texnik qo‘llab-quvvatlash",
  },
];
</script>

<template>
  <div
    id="header"
    class="mx-auto mb-16 md:mb-24 mt-[72px] max-w-[1440px] px-4 sm:px-5 lg:px-6 select-none"
  >
    <section class="hero-shell">
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
  border-radius: 28px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(10px);
  padding: 0.75rem;
}

.hero-swiper {
  position: relative;
  z-index: 1;
  width: 100%;
  margin: 0 auto;
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: #dfe6ee;
}

.hero-slide {
  position: relative;
  aspect-ratio: 16 / 6;
  min-height: 245px;
}

.hero-slide::after {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top, rgba(15, 23, 42, 0.22), transparent 40%),
    linear-gradient(to right, rgba(15, 23, 42, 0.12), transparent 28%);
  pointer-events: none;
}

.hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transform: scale(1.01);
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

@media (max-width: 1100px) {
  .hero-slide {
    min-height: 210px;
  }
}

@media (max-width: 700px) {
  .hero-shell {
    border-radius: 22px;
    padding: 0.6rem;
  }

  .hero-swiper {
    border-radius: 18px;
  }

  .hero-slide {
    min-height: 170px;
  }
}

:deep(.hero-swiper .swiper-pagination) {
  bottom: 10px;
}

:deep(.hero-swiper .swiper-pagination-bullet) {
  width: 7px;
  height: 7px;
  background: rgba(255, 255, 255, 0.72);
  opacity: 0.8;
}

:deep(.hero-swiper .swiper-pagination-bullet-active) {
  width: 22px;
  border-radius: 999px;
  background: #ffffff;
  opacity: 1;
}
</style>
