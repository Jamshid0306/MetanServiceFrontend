import { createI18n } from "vue-i18n";

import uz from "./locales/uz.json";
import ru from "./locales/ru.json";

const SUPPORTED_LOCALES = new Set(["uz", "ru"]);

const getSavedLocale = () => {
  if (typeof window === "undefined") {
    return "uz";
  }

  try {
    const savedLocale = String(window.localStorage.getItem("lang") || "uz").trim().toLowerCase();
    return SUPPORTED_LOCALES.has(savedLocale) ? savedLocale : "uz";
  } catch {
    return "uz";
  }
};

const savedLocale = getSavedLocale();

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: "uz",
  messages: {
    uz,
    ru,
  },
});
