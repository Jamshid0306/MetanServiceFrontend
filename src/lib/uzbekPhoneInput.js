/**
 * O‘zbekiston mobil raqami: +998 XX XXX XX XX (milliy 9 ta raqam).
 */

/**
 * Input matnidan faqat milliy 9 raqamni ajratadi (998 prefiksini tashlab).
 * @param {string} value
 * @returns {string}
 */
export function extractNationalDigitsFromInput(value = "") {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("998")) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

/**
 * Milliy raqamlardan qulay ko‘rinish: +998 XX XXX XX XX
 * Bo‘sh bo‘lsa fokus uchun +998 (bo‘sh joy bilan yozishga tayyor).
 * @param {string} nationalDigits
 * @returns {string}
 */
export function formatUzbekPhoneDisplay(nationalDigits) {
  const d = String(nationalDigits ?? "")
    .replace(/\D/g, "")
    .slice(0, 9);
  if (d.length === 0) {
    return "+998 ";
  }
  let out = "+998";
  out += " " + d.slice(0, 2);
  if (d.length > 2) {
    out += " " + d.slice(2, 5);
  }
  if (d.length > 5) {
    out += " " + d.slice(5, 7);
  }
  if (d.length > 7) {
    out += " " + d.slice(7, 9);
  }
  return out;
}
