const CYRILLIC_TO_LATIN = new Map([
  ["а", "a"],
  ["б", "b"],
  ["в", "v"],
  ["г", "g"],
  ["д", "d"],
  ["е", "e"],
  ["ё", "yo"],
  ["ж", "zh"],
  ["з", "z"],
  ["и", "i"],
  ["й", "y"],
  ["к", "k"],
  ["л", "l"],
  ["м", "m"],
  ["н", "n"],
  ["о", "o"],
  ["п", "p"],
  ["р", "r"],
  ["с", "s"],
  ["т", "t"],
  ["у", "u"],
  ["ф", "f"],
  ["х", "h"],
  ["ц", "ts"],
  ["ч", "ch"],
  ["ш", "sh"],
  ["щ", "sch"],
  ["ъ", ""],
  ["ы", "i"],
  ["ь", ""],
  ["э", "e"],
  ["ю", "yu"],
  ["я", "ya"],
]);

const normalizeWhitespace = (value = "") => String(value).replace(/\s+/g, " ").trim();

export const normalizeSearchText = (value = "") =>
  normalizeWhitespace(String(value).toLowerCase())
    .replace(/['`ʻʼ’]/g, "")
    .replace(/[^a-z0-9а-яё\s-]/gi, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const transliterateCyrillicToLatin = (value = "") =>
  Array.from(String(value).toLowerCase())
    .map((char) => CYRILLIC_TO_LATIN.get(char) ?? char)
    .join("");

const compactSearchText = (value = "") => normalizeSearchText(value).replace(/\s+/g, "");

const getProductSearchFields = (product = {}) =>
  [
    String(product?.id || ""),
    String(product?.name_uz || ""),
    String(product?.name_ru || ""),
    String(product?.name_en || ""),
    String(product?.characteristic_uz || ""),
    String(product?.characteristic_ru || ""),
    String(product?.characteristic_en || ""),
  ].filter(Boolean);

export const matchesProductSearch = (product, rawQuery) => {
  const query = normalizeSearchText(rawQuery);
  if (!query) return true;

  const compactQuery = compactSearchText(query);
  const transliteratedQuery = normalizeSearchText(transliterateCyrillicToLatin(query));
  const compactTransliteratedQuery = compactSearchText(transliteratedQuery);

  return getProductSearchFields(product).some((field) => {
    const normalizedField = normalizeSearchText(field);
    const transliteratedField = normalizeSearchText(transliterateCyrillicToLatin(normalizedField));
    const compactField = compactSearchText(normalizedField);
    const compactTransliteratedField = compactSearchText(transliteratedField);

    return (
      normalizedField.includes(query) ||
      transliteratedField.includes(transliteratedQuery) ||
      compactField.includes(compactQuery) ||
      compactTransliteratedField.includes(compactTransliteratedQuery)
    );
  });
};

export const scoreProductSearch = (product, rawQuery, locale = "uz") => {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 0;

  const compactQuery = compactSearchText(query);
  const transliteratedQuery = normalizeSearchText(transliterateCyrillicToLatin(query));
  const compactTransliteratedQuery = compactSearchText(transliteratedQuery);
  const preferredName = String(product?.[`name_${locale}`] || "");

  const scoreField = (field = "", weight = 1) => {
    const normalizedField = normalizeSearchText(field);
    const transliteratedField = normalizeSearchText(transliterateCyrillicToLatin(normalizedField));
    const compactField = compactSearchText(normalizedField);
    const compactTransliteratedField = compactSearchText(transliteratedField);

    let score = 0;

    if (normalizedField === query || transliteratedField === transliteratedQuery) score += 120 * weight;
    if (compactField === compactQuery || compactTransliteratedField === compactTransliteratedQuery) score += 100 * weight;
    if (normalizedField.startsWith(query) || transliteratedField.startsWith(transliteratedQuery)) score += 70 * weight;
    if (compactField.startsWith(compactQuery) || compactTransliteratedField.startsWith(compactTransliteratedQuery)) score += 60 * weight;
    if (normalizedField.includes(query) || transliteratedField.includes(transliteratedQuery)) score += 35 * weight;
    if (compactField.includes(compactQuery) || compactTransliteratedField.includes(compactTransliteratedQuery)) score += 30 * weight;

    return score;
  };

  let total =
    scoreField(preferredName, 2.2) +
    scoreField(product?.name_ru, 1.9) +
    scoreField(product?.name_uz, 1.8) +
    scoreField(product?.name_en, 1.6) +
    scoreField(product?.characteristic_ru, 0.7) +
    scoreField(product?.characteristic_uz, 0.7) +
    scoreField(product?.characteristic_en, 0.6);

  if (String(product?.id || "") === query) total += 200;
  else if (String(product?.id || "").includes(query)) total += 80;

  return total;
};
