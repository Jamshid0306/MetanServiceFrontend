<script setup>
import { ref, onMounted, defineAsyncComponent } from "vue";
import { CurrencyDollarIcon, CubeIcon, TagIcon } from "@heroicons/vue/24/outline";
import { useLoaderStore } from "@/store/loaderStore";
import { apiClient } from "@/lib/api";

const VChart = defineAsyncComponent(() => import("vue-echarts"));

const chartOptions = ref({});
const summary = ref({
  total_products: 0,
  avg_price: 0,
  max_price: 0,
});

const toNumberPrice = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return null;
  const num = Number(digits);
  return Number.isNaN(num) ? null : num;
};

const formatPrice = (value) =>
  Number(value || 0)
    .toLocaleString("ru-RU")
    .replace(/,/g, " ");

const getPriceRangeStats = (prices) => {
  const ranges = [
    { label: "0 - 500K", min: 0, max: 500000 },
    { label: "500K - 1M", min: 500000, max: 1000000 },
    { label: "1M - 2M", min: 1000000, max: 2000000 },
    { label: "2M+", min: 2000000, max: Infinity },
  ];

  return ranges.map((range) => {
    const count = prices.filter(
      (price) => price >= range.min && price < range.max
    ).length;
    return { name: range.label, count };
  });
};

const loadStats = async () => {
  try {
    const productsRes = await apiClient.get("/products/products", {
      params: { limit: 10000, offset: 0 },
    });

    const products = productsRes.data?.products || [];

    const numericPrices = products
      .map((p) => toNumberPrice(p.price_uz))
      .filter((p) => p !== null);

    const avgPrice = numericPrices.length
      ? Math.round(
          numericPrices.reduce((acc, n) => acc + n, 0) / numericPrices.length
        )
      : 0;

    const maxPrice = numericPrices.length ? Math.max(...numericPrices) : 0;

    summary.value = {
      total_products: products.length,
      avg_price: avgPrice,
      max_price: maxPrice,
    };

    const rangeStats = getPriceRangeStats(numericPrices);

    chartOptions.value = {
      tooltip: { trigger: "axis" },
      grid: { left: "4%", right: "4%", bottom: "6%", containLabel: true },
      xAxis: {
        type: "category",
        data: rangeStats.map((x) => x.name),
        axisLabel: { interval: 0 },
        axisLine: { lineStyle: { color: "#1a4f95" } },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: "#1a4f95" } },
        splitLine: { lineStyle: { color: "#ece7fb" } },
      },
      series: [
        {
          name: "Products",
          data: rangeStats.map((x) => x.count),
          type: "line",
          smooth: true,
          lineStyle: { width: 4, color: "#1A4F95" },
          symbolSize: 10,
          itemStyle: { color: "#0F2B66" },
          areaStyle: {
            color: "rgba(24, 79, 149, 0.15)",
          },
        },
      ],
    };
  } catch (err) {
    console.error("Statistics loading failed", err);
  } finally {
    useLoaderStore().loader = false;
  }
};

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="space-y-6">
    <div
      class="p-8 bg-gradient-to-br from-[#1A4F95] to-[#0F2B66] rounded-2xl shadow-2xl text-white"
    >
      <h2 class="text-3xl font-bold mb-4">Общая статистика по каталогу</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="flex items-center gap-4">
          <CubeIcon class="w-12 h-12 text-indigo-100" />
          <div>
            <p class="text-sm opacity-80">Товары</p>
            <p class="text-3xl font-extrabold">{{ summary.total_products }}</p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <CurrencyDollarIcon class="w-12 h-12 text-indigo-100" />
          <div>
            <p class="text-sm opacity-80">Средняя цена</p>
            <p class="text-3xl font-extrabold">
              {{ formatPrice(summary.avg_price) }} UZS
            </p>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <TagIcon class="w-12 h-12 text-indigo-100" />
          <div>
            <p class="text-sm opacity-80">Максимальная цена</p>
            <p class="text-3xl font-extrabold">
              {{ formatPrice(summary.max_price) }} UZS
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 bg-white rounded-xl shadow-lg">
      <h2 class="text-2xl font-semibold text-indigo-800 mb-4">
        Распределение товаров по ценовым диапазонам
      </h2>
      <Suspense>
        <VChart :option="chartOptions" autoresize style="width: 100%; height: 350px" />
        <template #fallback>
          <div class="h-[350px] flex items-center justify-center text-gray-400">
            Загрузка графика...
          </div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
