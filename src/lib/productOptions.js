export const PRODUCT_OPTION_GROUPS = [
  {
    key: "transmission",
    titleKey: "productOptions.transmission",
  },
  {
    key: "cylinder_volume",
    titleKey: "productOptions.cylinderVolume",
  },
  {
    key: "cylinder_position",
    titleKey: "productOptions.cylinderPosition",
  },
];

export const CREDIT_MONTH_OPTIONS = [3, 6, 9, 12];

const createOptionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `option-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const normalizeOption = (option = {}, groupKey, index) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return null;
  }

  const parsedDelta = parseNumericPrice(option?.price_delta);

  return {
    id: String(option?.id || `${groupKey}-${index + 1}`),
    label,
    price_delta: parsedDelta ?? 0,
  };
};

export const createEmptyOptionItem = () => ({
  id: createOptionId(),
  label: "",
  price_delta: "",
});

export const createEmptyProductOptions = () =>
  PRODUCT_OPTION_GROUPS.reduce((acc, group) => {
    acc[group.key] = [];
    return acc;
  }, {});

export const parseNumericPrice = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) {
    return null;
  }

  const numeric = Number(digits);
  return Number.isNaN(numeric) ? null : numeric;
};

export const parsePercentValue = (value) => {
  const numeric = parseNumericPrice(value);
  return numeric === null ? null : numeric;
};

export const formatPriceValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "number") {
    return `${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} UZS`;
  }

  const numeric = parseNumericPrice(value);
  if (numeric === null) {
    return String(value);
  }

  return `${numeric.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} UZS`;
};

export const normalizeProductOptions = (rawOptions = {}) => {
  let source = rawOptions;

  if (typeof rawOptions === "string") {
    try {
      source = JSON.parse(rawOptions);
    } catch {
      source = {};
    }
  }

  if (!source || typeof source !== "object") {
    source = {};
  }

  return PRODUCT_OPTION_GROUPS.reduce((acc, group) => {
    const items = Array.isArray(source[group.key]) ? source[group.key] : [];
    acc[group.key] = items
      .map((item, index) => normalizeOption(item, group.key, index))
      .filter(Boolean);
    return acc;
  }, createEmptyProductOptions());
};

export const serializeProductOptions = (optionsByGroup = {}) => {
  const normalized = normalizeProductOptions(optionsByGroup);

  return PRODUCT_OPTION_GROUPS.reduce((acc, group) => {
    acc[group.key] = normalized[group.key].map((option) => ({
      id: option.id || createOptionId(),
      label: option.label,
      price_delta: option.price_delta || 0,
    }));
    return acc;
  }, {});
};

export const hasConfigurableOptions = (product) => {
  const groups = normalizeProductOptions(product?.config_options);
  return PRODUCT_OPTION_GROUPS.some((group) => groups[group.key].length > 0);
};

export const getProductOptionGroups = (product) => {
  const groups = normalizeProductOptions(product?.config_options);

  return PRODUCT_OPTION_GROUPS.map((group) => ({
    ...group,
    options: groups[group.key],
  })).filter((group) => group.options.length > 0);
};

export const getDefaultOptionSelections = (product) => {
  const groups = getProductOptionGroups(product);

  return groups.reduce((acc, group) => {
    acc[group.key] = group.options[0]?.id || "";
    return acc;
  }, {});
};

export const getSelectedProductOptions = (product, selections = {}) => {
  const groups = getProductOptionGroups(product);

  return groups
    .map((group) => {
      const selectedId = selections[group.key] || group.options[0]?.id;
      const selectedOption = group.options.find((option) => option.id === selectedId);

      if (!selectedOption) {
        return null;
      }

      return {
        group_key: group.key,
        title_key: group.titleKey,
        id: selectedOption.id,
        label: selectedOption.label,
        price_delta: selectedOption.price_delta || 0,
      };
    })
    .filter(Boolean);
};

export const calculateConfiguredPrice = (product, locale, selections = {}) => {
  const basePrice = parseNumericPrice(product?.[`price_${locale}`]);
  if (basePrice === null) {
    return product?.[`price_${locale}`] || "";
  }

  const totalDelta = getSelectedProductOptions(product, selections).reduce(
    (sum, option) => sum + (option.price_delta || 0),
    0
  );

  return basePrice + totalDelta;
};

export const buildBasketKey = (productId, selectedOptions = []) => {
  const suffix = selectedOptions.length
    ? selectedOptions
        .map((option) => `${option.group_key}:${option.id}`)
        .sort()
        .join("|")
    : "base";

  return `${productId}:${suffix}`;
};

export const buildConfiguredBasketItem = (product, selections = {}, quantity = 1) => {
  const selectedOptions = getSelectedProductOptions(product, selections);

  return {
    ...product,
    quantity,
    selected_options: selectedOptions,
    selected_price_uz: calculateConfiguredPrice(product, "uz", selections),
    selected_price_ru: calculateConfiguredPrice(product, "ru", selections),
    selected_price_en: calculateConfiguredPrice(product, "en", selections),
    basket_key: buildBasketKey(product.id, selectedOptions),
  };
};

export const getBasketPrice = (item, locale) =>
  item?.[`selected_price_${locale}`] ?? item?.[`price_${locale}`] ?? "";

export const hasCreditPricing = (product) =>
  Boolean(product?.credit_enabled) && parsePercentValue(product?.credit_6m_percent) !== null;

export const calculateCreditPlan = (basePrice, sixMonthPercent, months) => {
  const numericBasePrice =
    typeof basePrice === "number" ? basePrice : parseNumericPrice(basePrice);
  const numericPercent = parsePercentValue(sixMonthPercent);

  if (
    numericBasePrice === null ||
    numericPercent === null ||
    !Number.isFinite(months) ||
    months <= 0
  ) {
    return null;
  }

  const monthlyPercent = numericPercent / 6;
  const total = Math.round(numericBasePrice * (1 + (monthlyPercent * months) / 100));
  const monthlyPayment = Math.round(total / months);

  return {
    months,
    total,
    monthlyPayment,
    appliedPercent: Math.round(monthlyPercent * months * 100) / 100,
  };
};
