import { createApp } from "vue";
import App from "./App.vue";
import { createPinia } from "pinia";
import router from "./router/index";
import { i18n } from "./i18n";
import piniaPluginPersistedstate from "pinia-plugin-persistedstate";

import { defineAsyncComponent } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from "echarts/components";

// Faqat keraklilarini ulash
use([CanvasRenderer, LineChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent]);

// vue-echarts ni async component sifatida olish
const ECharts = defineAsyncComponent(() => import("vue-echarts"));

import "./index.css";

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(router);
app.use(pinia);
app.use(i18n);
app.component("v-chart", ECharts);
app.mount("#app");
