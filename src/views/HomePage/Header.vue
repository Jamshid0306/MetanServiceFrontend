<script setup>
import { computed, onMounted, ref } from "vue";

import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/vue";

import { apiClient, resolveAssetUrl } from "@/lib/api";

import heroProducts from "@/assets/images/hero-products.jpg";
import heroService from "@/assets/images/hero-service.jpg";
import heroSupport from "@/assets/images/hero-support.jpg";
import imageOne from "@/assets/images/1.png";
import imageTwo from "@/assets/images/2.png";
import imageThree from "@/assets/images/3.png";
import imageFour from "@/assets/images/4.png";
import "swiper/css";

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

const MIN_LOOP_SLIDES = 4;
const heroSwiper = ref(null);
const activeHeroIndex = ref(0);

const swiperSlides = computed(() => {
  const slides = displaySlides.value;
  if (!slides.length) {
    return [];
  }

  const repeatCount =
    slides.length >= MIN_LOOP_SLIDES
      ? 1
      : Math.ceil(MIN_LOOP_SLIDES / slides.length);

  return Array.from({ length: repeatCount }, () => slides)
    .flat()
    .map((slide, index) => ({
      ...slide,
      renderKey: `${slide.id || slide.src}-${index}`,
    }));
});

const getOriginalSlideIndex = (swiper) => {
  const total = displaySlides.value.length;
  if (!total) {
    return 0;
  }

  const rawIndex = Number(swiper?.realIndex ?? swiper?.activeIndex ?? 0);
  return ((rawIndex % total) + total) % total;
};

const updateActiveHeroIndex = (swiper) => {
  activeHeroIndex.value = getOriginalSlideIndex(swiper);
};

const onHeroSwiper = (swiper) => {
  heroSwiper.value = swiper;
  updateActiveHeroIndex(swiper);
};

const goToHeroSlide = (index) => {
  activeHeroIndex.value = index;
  heroSwiper.value?.slideToLoop(index);
};

const heroSwiperKey = computed(() =>
  displaySlides.value.map((slide) => slide.id || slide.src).join("|")
);

const heroSwiperBreakpoints = computed(() => {
  if (displaySlides.value.length <= 1) {
    return {
      0: { slidesPerView: 1, spaceBetween: 0 },
    };
  }

  return {
    0: { slidesPerView: 1.16, spaceBetween: 10 },
    700: { slidesPerView: 1.2, spaceBetween: 12 },
    1100: { slidesPerView: 1.24, spaceBetween: 14 },
  };
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
    class="hero-header mx-auto mb-16 md:mb-24 max-[600px]:mb-0 mt-[72px] select-none"
  >
    <section class="hero-shell">
      <div v-if="swiperSlides.length" class="hero-swiper-area">
        <Swiper
          :key="heroSwiperKey"
          :modules="[Autoplay]"
          :loop="true"
          :speed="850"
          :centered-slides="displaySlides.length > 1"
          :slides-per-view="displaySlides.length > 1 ? 1.16 : 1"
          :space-between="displaySlides.length > 1 ? 10 : 0"
          :breakpoints="heroSwiperBreakpoints"
          :autoplay="displaySlides.length > 1 ? { delay: 3200, disableOnInteraction: false } : false"
          :observer="true"
          :observe-parents="true"
          class="hero-swiper"
          @swiper="onHeroSwiper"
          @slideChange="updateActiveHeroIndex"
        >
          <SwiperSlide
            v-for="slide in swiperSlides"
            :key="slide.renderKey"
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

        <div
          v-if="displaySlides.length > 1"
          class="hero-pagination"
          aria-label="Hero banner navigatsiyasi"
        >
          <button
            v-for="(_, index) in displaySlides"
            :key="index"
            type="button"
            class="hero-pagination-bullet"
            :class="{ 'hero-pagination-bullet-active': activeHeroIndex === index }"
            :aria-label="`${index + 1}-bannerga o'tish`"
            @click="goToHeroSlide(index)"
          />
        </div>
      </div>
      <div v-else class="hero-empty">
        <p>Hero banner hali qo‘shilmagan</p>
      </div>
      <div class="hero-payment-note">
        <span>Mahsulotlarni muddatli to‘lov yoki 100% to‘lov orqali xarid qilishingiz mumkin.</span>
      </div>

      <div class="hero-brand-strip" aria-label="Brend rasmlari">
        <img :src="imageOne" alt="Brend rasm 1" class="hero-brand-image" />
        <img :src="imageTwo" alt="Brend rasm 2" class="hero-brand-image" />
        <img :src="imageThree" alt="Brend rasm 3" class="hero-brand-image" />
        <img :src="imageFour" alt="Metan Service logo" class="hero-brand-image" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.hero-shell {
  position: relative;
  overflow: visible;
  border-radius: 0;
  border: none;
  background: transparent;
  backdrop-filter: none;
  padding: 20px 0 0;
}

.hero-header {
  width: 100%;
  max-width: 1440px;
  overflow: visible;
  padding-inline: 1rem;
}

@media (min-width: 640px) {
  .hero-header {
    padding-inline: 1.25rem;
  }
}

@media (min-width: 1024px) {
  .hero-header {
    padding-inline: 1.5rem;
  }
}

.hero-swiper-area {
  position: relative;
  width: 100%;
  margin: 0 auto;
  overflow: visible;
}

.hero-swiper {
  position: relative;
  z-index: 1;
  width: 100%;
  border-radius: 22px;
  overflow: hidden;
  border: none;
  background: transparent;
}

.hero-slide {
  position: relative;
  height: clamp(245px, 28vw, 420px);
  border-radius: 20px;
  overflow: hidden;
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

.hero-pagination {
  position: absolute;
  left: 50%;
  bottom: 10px;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transform: translateX(-50%);
}

.hero-pagination-bullet {
  width: 7px;
  height: 7px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  opacity: 0.8;
  padding: 0;
  transition:
    width 0.2s ease,
    background 0.2s ease,
    opacity 0.2s ease;
}

.hero-pagination-bullet-active {
  width: 22px;
  background: #ffffff;
  opacity: 1;
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

.hero-brand-strip {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  gap: 0.6rem;
  margin-top: 0.75rem;
}

.hero-brand-image {
  flex: 0 0 78px;
  width: 78px;
  height: 78px;
  aspect-ratio: 1 / 1;
  display: block;
  border-radius: 14px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #f6f8fb;
  object-fit: contain;
  padding: 0.35rem;
}

@media (max-width: 1100px) {
  .hero-slide {
    height: clamp(210px, 28vw, 340px);
  }
}

@media (max-width: 700px) {
  .hero-shell {
    border-radius: 0;
    padding: 20px 0 0;
  }

  .hero-swiper {
    border-radius: 18px;
  }

  .hero-slide {
    height: clamp(170px, 42vw, 240px);
  }

  .hero-image {
    object-fit: cover;
  }

  .hero-empty {
    min-height: 190px;
  }

  .hero-payment-note {
    border-radius: 16px;
    padding: 0.75rem 0.8rem;
    font-size: 0.86rem;
  }

  .hero-brand-strip {
    gap: 0.35rem;
  }

  .hero-brand-image {
    flex-basis: 60px;
    width: 60px;
    height: 60px;
    border-radius: 12px;
    padding: 0.2rem;
  }
}

@media (max-width: 630px) {
  .hero-header {
    max-width: none;
    padding-inline: 0;
  }
}

@media (max-width: 600px) {
  .hero-shell {
    padding-bottom: 0;
  }

  .hero-brand-strip {
    justify-content: center;
    margin-bottom: 0;
  }

  .hero-brand-image {
    flex: 0 0 60px;
    width: 60px;
    height: 60px;
    min-width: 0;
    aspect-ratio: 1 / 1;
  }
}

</style>
