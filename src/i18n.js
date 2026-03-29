import { createI18n } from "vue-i18n";

import uz from "./locales/uz.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

const getSavedLocale = () => {
  if (typeof window === "undefined") {
    return "ru";
  }

  try {
    return window.localStorage.getItem("lang") || "ru";
  } catch {
    return "ru";
  }
};

const savedLocale = getSavedLocale();

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
