<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { apiClient, getApiErrorMessage, resolveAssetUrl } from "@/lib/api";
import {
  getStoredCustomerAccessToken,
  getStoredCustomerSession,
  storeCustomerSession,
} from "@/lib/customerSession";

const router = useRouter();
const { t, locale } = useI18n();
const customerSession = ref(null);
const favoriteProducts = ref([]);
const loading = ref(false);
const errorMessage = ref("");

const authConfig = () => {
  const accessToken = getStoredCustomerAccessToken();
  if (!accessToken) {
    return null;
  }

  return {
    skipAuth: true,
    skipAuthRefresh: true,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
};

const productName = (product = {}) =>
  product?.[`name_${locale.value}`] || product?.name_uz || product?.name_ru || "";

const productPrice = (product = {}) =>
  product?.[`price_${locale.value}`] || product?.price_uz || product?.price_ru || "";

const productImage = (product = {}) => resolveAssetUrl(product?.images?.[0]) || "";

const loadFavorites = async () => {
  const config = authConfig();
  if (!config) {
    router.push("/login");
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const response = await apiClient.get("/customers/me/favorites", config);
    const favoriteIds = Array.isArray(response.data?.favorites) ? response.data.favorites : [];
    if (response.data?.customer) {
      storeCustomerSession(response.data.customer);
      customerSession.value = response.data.customer;
    }

    const productResponses = await Promise.allSettled(
      favoriteIds.map((id) =>
        apiClient.get(`/products/product/detail/${id}`, { skipAuth: true })
      )
    );
    favoriteProducts.value = productResponses
      .filter((item) => item.status === "fulfilled" && item.value?.data)
      .map((item) => item.value.data);
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("profile.favoritesLoadError"));
    favoriteProducts.value = [];
  } finally {
    loading.value = false;
  }
};

const removeFavorite = async (productId) => {
  const config = authConfig();
  if (!config) {
    router.push("/login");
    return;
  }

  try {
    const response = await apiClient.delete(`/customers/me/favorites/${productId}`, config);
    if (response.data?.customer) {
      storeCustomerSession(response.data.customer);
      customerSession.value = response.data.customer;
    }
    favoriteProducts.value = favoriteProducts.value.filter(
      (product) => Number(product.id) !== Number(productId)
    );
  } catch (error) {
    errorMessage.value = getApiErrorMessage(error, t("profile.favoritesLoadError"));
  }
};

onMounted(() => {
  customerSession.value = getStoredCustomerSession();
  if (!customerSession.value && !getStoredCustomerAccessToken()) {
    router.push("/login");
    return;
  }
  loadFavorites();
});
</script>

<template>
  <main class="favorites-page">
    <header class="favorites-head">
      <button type="button" class="favorites-back" @click="router.back()">
        <span aria-hidden="true">‹</span>
        {{ t("nav.back") }}
      </button>
      <h1>{{ t("profile.favorites") }}</h1>
      <span aria-hidden="true" />
    </header>

    <section v-if="loading" class="favorites-empty">
      {{ t("profile.favoritesLoading") }}
    </section>

    <section v-else-if="errorMessage" class="favorites-empty">
      <p>{{ errorMessage }}</p>
      <button type="button" @click="loadFavorites">
        {{ t("checkoutPage.refreshStatus") }}
      </button>
    </section>

    <section v-else-if="!favoriteProducts.length" class="favorites-empty">
      <div class="favorites-empty-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s-7.5-4.7-9.6-9.2C.9 8.5 2.9 5 6.4 5c2 0 3.4 1.1 4.1 2.2C11.2 6.1 12.6 5 14.6 5c3.5 0 5.5 3.5 4 6.8C16.5 16.3 12 21 12 21Zm0-2.5c2.4-1.7 5.7-5 6.7-7.5.9-2-.2-4-2.3-4-1.7 0-2.8 1.2-3.5 2.4h-1.8C10.4 8.2 9.3 7 7.6 7 5.5 7 4.4 9 5.3 11c1 2.5 4.3 5.8 6.7 7.5Z" />
        </svg>
      </div>
      <h2>{{ t("profile.emptyFavoritesTitle") }}</h2>
      <p>{{ t("profile.emptyFavoritesText") }}</p>
      <button type="button" @click="router.push('/products')">
        {{ t("profile.browseProducts") }}
      </button>
    </section>

    <section v-else class="favorites-list">
      <article
        v-for="product in favoriteProducts"
        :key="product.id"
        class="favorite-card"
      >
        <button
          type="button"
          class="favorite-card-main"
          @click="router.push(`/product/${product.id}`)"
        >
          <div class="favorite-card-image">
            <img v-if="productImage(product)" :src="productImage(product)" :alt="productName(product)" />
          </div>
          <div class="favorite-card-copy">
            <strong>{{ productName(product) }}</strong>
            <span>{{ productPrice(product) }} {{ t("uzs") }}</span>
          </div>
        </button>
        <button
          type="button"
          class="favorite-remove"
          @click="removeFavorite(product.id)"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7.5-4.7-9.6-9.2C.9 8.5 2.9 5 6.4 5c2 0 3.4 1.1 4.1 2.2C11.2 6.1 12.6 5 14.6 5c3.5 0 5.5 3.5 4 6.8C16.5 16.3 12 21 12 21Z" />
          </svg>
        </button>
      </article>
    </section>
  </main>
</template>

<style scoped>
.favorites-page {
  max-width: 720px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 122px 14px 92px;
  background: #f7f7f8;
}

.favorites-head {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.favorites-head h1 {
  margin: 0;
  color: #111827;
  font-size: 1.1rem;
  font-weight: 900;
  text-align: center;
}

.favorites-back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 40px;
  border: 0;
  background: transparent;
  color: #18304f;
  padding: 0;
  font-weight: 800;
}

.favorites-back span {
  font-size: 2rem;
  line-height: 1;
}

.favorites-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  border-radius: 8px;
  background: #fff;
  padding: 28px 18px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.favorites-empty-icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f5f5f9;
  color: #9ca3af;
}

.favorites-empty-icon svg {
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.favorites-empty h2 {
  margin: 4px 0 0;
  color: #111827;
  font-size: 1.15rem;
  font-weight: 900;
}

.favorites-empty p {
  max-width: 360px;
  margin: 0;
  color: #6b7280;
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.45;
}

.favorites-empty button {
  min-height: 44px;
  margin-top: 8px;
  border: 0;
  border-radius: 8px;
  background: #18304f;
  color: #fff;
  padding: 0 16px;
  font-weight: 900;
}

.favorites-list {
  display: grid;
  gap: 10px;
}

.favorite-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px;
  align-items: stretch;
  overflow: hidden;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.favorite-card-main {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 10px;
  text-align: left;
}

.favorite-card-image {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #f5f5f9;
  overflow: hidden;
}

.favorite-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.favorite-card-copy {
  min-width: 0;
  display: grid;
  gap: 6px;
}

.favorite-card-copy strong {
  display: -webkit-box;
  overflow: hidden;
  color: #111827;
  font-size: 0.94rem;
  font-weight: 900;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.favorite-card-copy span {
  color: #18304f;
  font-size: 0.9rem;
  font-weight: 900;
}

.favorite-remove {
  display: grid;
  place-items: center;
  border: 0;
  border-left: 1px solid #f1f5f9;
  background: #fff;
  color: #dc2626;
}

.favorite-remove svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}
</style>
