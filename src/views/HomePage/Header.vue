<script setup>
import { computed, onMounted, ref } from "vue";

import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";

import { apiClient, resolveAssetUrl } from "@/lib/api";

import heroProducts from "@/assets/images/hero-products.jpg";
import heroService from "@/assets/images/hero-service.jpg";
import heroSupport from "@/assets/images/hero-support.jpg";
import "swiper/css";
import "swiper/css/pagination";

const fallbackSlides = [
  {
    id: "fallback-products",
    src: heroProducts,
    alt: "Metan uskunalari va jihozlari",
    productLink: "",
  },
  {
    id: "fallback-service",
    src: heroService,
    alt: "Urganch Metan Service servis ishlari",
    productLink: "",
  },
  {
    id: "fallback-support",
    src: heroSupport,
    alt: "Metan tizimlari bo‘yicha texnik qo‘llab-quvvatlash",
    productLink: "",
  },
];

const heroSlides = ref([]);
const hasFetchedSlides = ref(false);
const loadFailed = ref(false);

const displaySlides = computed(() => {
  if (!hasFetchedSlides.value || loadFailed.value) {
    return fallbackSlides;
  }

  return heroSlides.value;
});

onMounted(async () => {
  try {
    const res = await apiClient.get("/hero-slides");
    const slides = Array.isArray(res.data?.slides) ? res.data.slides : [];
    heroSlides.value = slides.map((slide) => ({
      id: slide.id,
      src: resolveAssetUrl(slide.image_path),
      alt: `Urganch Metan Service hero banner ${slide.id}`,
      productLink: slide.product_link || "",
    }));
    hasFetchedSlides.value = true;
  } catch {
    loadFailed.value = true;
  }
});
</script>

<template>
  <div
    id="header"
    class="mx-auto mb-16 md:mb-24 mt-[72px] max-w-[1440px] px-4 sm:px-5 lg:px-6 select-none"
  >
    <section class="hero-shell">
      <Swiper
        v-if="displaySlides.length"
        :modules="[Autoplay, Pagination]"
        :loop="displaySlides.length > 1"
        :speed="850"
        :autoplay="{ delay: 3200, disableOnInteraction: false }"
        :pagination="{ clickable: true }"
        class="hero-swiper reveal-up"
      >
        <SwiperSlide
          v-for="slide in displaySlides"
          :key="slide.id || slide.src"
          class="hero-slide"
        >
          <a
            v-if="slide.productLink"
            :href="slide.productLink"
            class="hero-link"
            aria-label="Mahsulot sahifasiga o'tish"
          >
            <img :src="slide.src" :alt="slide.alt" class="hero-image" />
          </a>
          <img v-else :src="slide.src" :alt="slide.alt" class="hero-image" />
        </SwiperSlide>
      </Swiper>
      <div v-else class="hero-empty reveal-up">
        <p>Hero banner hali qo‘shilmagan</p>
      </div>
      <div class="hero-payment-note reveal-up">
        <span>Mahsulotlarni muddatli to‘lov yoki 100% to‘lov orqali xarid qilishingiz mumkin.</span>
      </div>
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

.hero-link {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.hero-payment-note {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.75rem;
  border-radius: 18px;
  border: 1px solid rgba(20, 35, 56, 0.1);
  background: rgba(255, 255, 255, 0.84);
  padding: 0.9rem 1rem;
  color: #18304f;
  text-align: center;
  font-size: clamp(0.92rem, 1.5vw, 1.05rem);
  font-weight: 800;
  line-height: 1.35;
}

.hero-empty {
  display: grid;
  place-items: center;
  min-height: 280px;
  border-radius: 22px;
  border: 1px dashed rgba(20, 35, 56, 0.16);
  background:
    radial-gradient(circle at top right, rgba(37, 87, 164, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(243, 247, 251, 0.96), rgba(231, 237, 245, 0.9));
  color: #29415f;
  font-size: 1rem;
  font-weight: 700;
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

  .hero-image {
    object-fit: fill;
  }

  .hero-empty {
    min-height: 190px;
  }

  .hero-payment-note {
    border-radius: 16px;
    padding: 0.75rem 0.8rem;
    font-size: 0.86rem;
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
