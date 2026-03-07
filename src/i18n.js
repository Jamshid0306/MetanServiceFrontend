import { createI18n } from "vue-i18n";

import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

const savedLocale = localStorage.getItem("lang") || "ru";

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: "ru",
  messages: {
    uz,
    ru,
    en,
  },
});
