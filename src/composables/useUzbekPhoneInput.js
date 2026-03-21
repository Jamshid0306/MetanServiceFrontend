import { nextTick, ref } from "vue";
import {
  extractNationalDigitsFromInput,
  formatUzbekPhoneDisplay,
} from "@/lib/uzbekPhoneInput";

/**
 * Login / register telefon maydoni: fokusda +998, yozilganda +998 XX XXX XX XX
 */
export function useUzbekPhoneInput() {
  const phone = ref("");

  const onPhoneFocus = () => {
    if (!extractNationalDigitsFromInput(phone.value)) {
      phone.value = "+998 ";
    }
  };

  const onPhoneBlur = () => {
    if (!extractNationalDigitsFromInput(phone.value)) {
      phone.value = "";
    }
  };

  const onPhoneInput = (event) => {
    const national = extractNationalDigitsFromInput(event.target.value);
    phone.value = formatUzbekPhoneDisplay(national);
    nextTick(() => {
      const el = event.target;
      const len = phone.value.length;
      el.setSelectionRange(len, len);
    });
  };

  return {
    phone,
    onPhoneFocus,
    onPhoneBlur,
    onPhoneInput,
  };
}
