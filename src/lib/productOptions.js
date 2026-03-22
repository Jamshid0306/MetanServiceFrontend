export const PRODUCT_OPTION_GROUPS = [
  {
    key: "fuel_type",
    titleKey: "productOptions.fuelType",
  },
  {
    key: "transmission",
    titleKey: "productOptions.transmission",
  },
  {
    key: "cylinder_volume",
    titleKey: "productOptions.cylinderVolume",
  },
];

export const CREDIT_MONTH_OPTIONS = [3, 6, 9, 12];

const CONFIG_SCHEMA_VERSION = 5;
const DEFAULT_FUEL_TYPE_LABEL = "Standart";
const DEFAULT_TRANSMISSION_LABEL = "Standart";
const ASK_PRICE_BY_LOCALE = {
  uz: "Narxni so’rang",
  ru: "Цену уточняйте",
  en: "Request price",
};

const createOptionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `option-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toOptionId = (value, fallback) => String(value || fallback).trim();

const normalizePriceDelta = (value) => parseNumericPrice(value) ?? 0;
const normalizePositiveInteger = (value, fallback = null) => {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) {
    return fallback;
  }

  const numeric = Number(digits);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return numeric;
};
const normalizeCylinderCount = (value) => normalizePositiveInteger(value, 1);

const normalizeCylinderVolumeItem = (option = {}, index = 0, prefix = "cylinder-volume") => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return null;
  }

  return {
    id: toOptionId(option?.id, `${prefix}-${index + 1}`),
    label,
    count: normalizeCylinderCount(option?.count),
    price_delta: normalizePriceDelta(option?.price_delta),
  };
};

const normalizeCylinderVolumeList = (rawOptions = [], prefix = "cylinder-volume") =>
  (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option, index) => normalizeCylinderVolumeItem(option, index, prefix))
    .filter(Boolean);

/** Eski JSON: balonlar avlod ostida; yangi: to‘g‘ridan-to‘g‘ri transmission ostida. */
const collectRawCylinderVolumesFromTransmission = (option = {}, fallbackVolumes = []) => {
  const direct = Array.isArray(option?.cylinder_volumes) ? option.cylinder_volumes : [];
  if (direct.length) {
    return direct;
  }
  const gens = Array.isArray(option?.generations) ? option.generations : [];
  if (gens.length) {
    return gens.flatMap((g) =>
      Array.isArray(g?.cylinder_volumes) ? g.cylinder_volumes : []
    );
  }
  return Array.isArray(fallbackVolumes) ? fallbackVolumes : [];
};

const normalizeTransmissionItem = (
  option = {},
  index = 0,
  prefix = "transmission",
  fallbackCylinderVolumes = []
) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return null;
  }

  const optionId = toOptionId(option?.id, `${prefix}-${index + 1}`);
  const rawVolumes = collectRawCylinderVolumesFromTransmission(option, fallbackCylinderVolumes);

  return {
    id: optionId,
    label,
    hidden: Boolean(option?.hidden),
    price_delta: normalizePriceDelta(option?.price_delta),
    cylinder_volumes: normalizeCylinderVolumeList(rawVolumes, `${optionId}-volume`),
  };
};

const normalizeTransmissionList = (
  rawOptions = [],
  prefix = "transmission",
  fallbackCylinderVolumes = []
) =>
  (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option, index) =>
      normalizeTransmissionItem(option, index, prefix, fallbackCylinderVolumes)
    )
    .filter(Boolean);

const normalizeFuelTypeItem = (
  option = {},
  index = 0,
  prefix = "fuel-type",
  fallbackTransmissions = []
) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return null;
  }

  const optionId = toOptionId(option?.id, `${prefix}-${index + 1}`);
  const rawTransmissions = Array.isArray(option?.transmissions)
    ? option.transmissions
    : fallbackTransmissions;

  return {
    id: optionId,
    label,
    hidden: Boolean(option?.hidden),
    transmissions: normalizeTransmissionList(rawTransmissions, `${optionId}-transmission`),
  };
};

const normalizeFuelTypeList = (
  rawOptions = [],
  prefix = "fuel-type",
  fallbackTransmissions = []
) =>
  (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option, index) =>
      normalizeFuelTypeItem(option, index, prefix, fallbackTransmissions)
    )
    .filter(Boolean);

const createSyntheticTransmission = (cylinderVolumes = []) => ({
  id: "transmission-default",
  label: DEFAULT_TRANSMISSION_LABEL,
  hidden: true,
  price_delta: 0,
  cylinder_volumes: normalizeCylinderVolumeList(
    cylinderVolumes,
    "transmission-default-volume"
  ),
});

const createSyntheticFuelType = (transmissions = []) => ({
  id: "fuel-type-default",
  label: DEFAULT_FUEL_TYPE_LABEL,
  hidden: true,
  transmissions: normalizeTransmissionList(transmissions, "fuel-type-default-transmission"),
});

const normalizeLegacyConfig = (source = {}) => {
  const legacyVolumes = normalizeCylinderVolumeList(source?.cylinder_volume, "legacy-volume");
  const legacyTransmissions = normalizeTransmissionList(
    source?.transmission,
    "legacy-transmission",
    legacyVolumes
  );

  if (legacyTransmissions.length) {
    return [createSyntheticFuelType(legacyTransmissions)];
  }

  if (legacyVolumes.length) {
    return [createSyntheticFuelType([createSyntheticTransmission(legacyVolumes)])];
  }

  const directTransmissions = normalizeTransmissionList(source?.transmissions, "transmission");
  if (directTransmissions.length) {
    return [createSyntheticFuelType(directTransmissions)];
  }

  return [];
};

const getNormalizedConfig = (rawOptions = {}) => {
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

  const fuelTypes = Array.isArray(source.fuel_types)
    ? normalizeFuelTypeList(source.fuel_types)
    : normalizeLegacyConfig(source);

  return {
    schema_version: CONFIG_SCHEMA_VERSION,
    fuel_types: fuelTypes,
  };
};

const findOptionById = (options = [], optionId = "") =>
  options.find((option) => option.id === optionId) || null;

const toVisibleOptions = (options = []) => options.filter((option) => !option.hidden);

const dedupeOptionsById = (options = []) => {
  const seen = new Set();
  return (Array.isArray(options) ? options : []).filter((option) => {
    const oid = String(option?.id || "").trim();
    if (!oid || seen.has(oid)) {
      return false;
    }
    seen.add(oid);
    return true;
  });
};

const mergeCylinderVolumesForTransmission = (transmission) => {
  if (!transmission) {
    return [];
  }
  const list = Array.isArray(transmission.cylinder_volumes) ? transmission.cylinder_volumes : [];
  return dedupeOptionsById(toVisibleOptions(list));
};

/** Barcha yoqil‘i turlaridan dasturlarni bitta ro‘yxat (UI da metan/propan tanlanmaydi). */
const getAllTransmissionsMerged = (config) =>
  dedupeOptionsById(
    (config.fuel_types || []).flatMap((ft) =>
      toVisibleOptions(ft.transmissions || [])
    )
  );

const resolveFuelTypeContainingTransmission = (config, transmissionId) => {
  const tid = String(transmissionId || "").trim();
  if (!tid) {
    return null;
  }
  for (const ft of config.fuel_types || []) {
    if (findOptionById(toVisibleOptions(ft.transmissions || []), tid)) {
      return ft;
    }
  }
  return null;
};

const resolveOptionFromSelection = (options = [], optionId = "", config = {}) => {
  const selectedOption = findOptionById(options, optionId);
  if (selectedOption) {
    return selectedOption;
  }

  if (config.useFallbackPath !== false) {
    return options[0] || null;
  }

  const visibleOptions = toVisibleOptions(options);
  if (!visibleOptions.length) {
    return options[0] || null;
  }

  return null;
};

const resolveSelectedPath = (product, selections = {}, pathConfig = {}) => {
  const config = getNormalizedConfig(product?.config_options);
  const allTransmissions = getAllTransmissionsMerged(config);
  const transmission = resolveOptionFromSelection(
    allTransmissions,
    selections.transmission,
    pathConfig
  );
  let fuelType = resolveOptionFromSelection(
    config.fuel_types,
    selections.fuel_type,
    pathConfig
  );
  if (!fuelType && transmission) {
    fuelType = resolveFuelTypeContainingTransmission(config, transmission.id);
  }
  const cylinderVolumesMerged = mergeCylinderVolumesForTransmission(transmission);
  const cylinderVolume = resolveOptionFromSelection(
    cylinderVolumesMerged,
    selections.cylinder_volume,
    pathConfig
  );

  return {
    config,
    fuelType,
    transmission,
    cylinderVolume,
  };
};

export const createEmptyCylinderVolumeItem = () => ({
  id: createOptionId(),
  label: "",
  count: "1",
  price_delta: "",
});

export const createEmptyTransmissionItem = () => ({
  id: createOptionId(),
  label: "",
  price_delta: "",
  cylinder_volumes: [],
});

export const createEmptyFuelTypeItem = () => ({
  id: createOptionId(),
  label: "",
  hidden: false,
  transmissions: [],
});

export const createEmptyProductOptions = () => ({
  schema_version: CONFIG_SCHEMA_VERSION,
  fuel_types: [],
});

export const createEmptyCreditPlan = (months = CREDIT_MONTH_OPTIONS[0]) => ({
  id: createOptionId(),
  months: String(months),
  percent: "",
});

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

export const formatCylinderCountLabel = (count) => {
  const numeric = normalizePositiveInteger(count);
  return Number.isFinite(numeric) && numeric > 1 ? `x${numeric} ta` : "";
};

export const formatCylinderOptionLabel = (option) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return "";
  }

  const countLabel = formatCylinderCountLabel(option?.count);
  return countLabel ? `${label} ${countLabel}` : label;
};

export const normalizeProductOptions = (rawOptions = {}) => getNormalizedConfig(rawOptions);

export const getProductDefaultPrice = (product, locale = "uz") => {
  const defaultPrice = String(product?.default_price || "").trim();
  if (defaultPrice) {
    const numericDefaultPrice = parseNumericPrice(defaultPrice);
    return numericDefaultPrice === null ? defaultPrice : numericDefaultPrice;
  }

  const localizedPrice = product?.[`price_${locale}`];
  if (localizedPrice !== null && localizedPrice !== undefined && localizedPrice !== "") {
    return localizedPrice;
  }

  return ASK_PRICE_BY_LOCALE[locale] || ASK_PRICE_BY_LOCALE.uz;
};

export const serializeProductOptions = (rawOptions = {}) => {
  const normalized = getNormalizedConfig(rawOptions);

  return {
    schema_version: CONFIG_SCHEMA_VERSION,
    fuel_types: normalized.fuel_types.map((fuelType) => ({
      id: fuelType.id || createOptionId(),
      label: fuelType.label,
      hidden: false,
      transmissions: fuelType.transmissions.map((transmission) => ({
        id: transmission.id || createOptionId(),
        label: transmission.label,
        hidden: Boolean(transmission.hidden),
        price_delta: transmission.price_delta || 0,
        cylinder_volumes: (transmission.cylinder_volumes || []).map((volume) => ({
          id: volume.id || createOptionId(),
          label: volume.label,
          count: normalizeCylinderCount(volume.count),
          price_delta: volume.price_delta || 0,
        })),
      })),
    })),
  };
};

export const hasConfigurableOptions = (product) => {
  const config = getNormalizedConfig(product?.config_options);

  return (
    config.fuel_types.some((fuelType) => !fuelType.hidden) ||
    config.fuel_types.some((fuelType) =>
      fuelType.transmissions.some((transmission) => !transmission.hidden)
    ) ||
    config.fuel_types.some((fuelType) =>
      fuelType.transmissions.some((transmission) =>
        (transmission.cylinder_volumes || []).some((v) => v && !v.hidden)
      )
    ) ||
    config.fuel_types.some((fuelType) =>
      fuelType.transmissions.some(
        (transmission) => (transmission.cylinder_volumes || []).length > 0
      )
    )
  );
};

export const ensureValidOptionSelections = (product, selections = {}) => {
  const { fuelType, transmission, cylinderVolume } = resolveSelectedPath(
    product,
    selections
  );
  const nextSelections = {};

  if (fuelType) {
    nextSelections.fuel_type = fuelType.id;
  }

  if (transmission) {
    nextSelections.transmission = transmission.id;
  }

  if (cylinderVolume) {
    nextSelections.cylinder_volume = cylinderVolume.id;
  }

  return nextSelections;
};

export const getProductOptionGroups = (product, selections = {}, pathConfig = {}) => {
  const { config, transmission } = resolveSelectedPath(
    product,
    selections,
    pathConfig
  );
  const groups = [];
  const visibleTransmissions = getAllTransmissionsMerged(config);

  if (visibleTransmissions.length) {
    groups.push({
      key: "transmission",
      titleKey: "productOptions.transmission",
      options: visibleTransmissions.map((option) => ({
        id: option.id,
        label: option.label,
        price_delta: 0,
      })),
    });
  }

  const cylinderVolumesMerged = toVisibleOptions(mergeCylinderVolumesForTransmission(transmission));
  if (cylinderVolumesMerged.length) {
    groups.push({
      key: "cylinder_volume",
      titleKey: "productOptions.cylinderVolume",
      options: cylinderVolumesMerged.map((option) => ({
        id: option.id,
        label: option.label,
        count: normalizeCylinderCount(option.count),
        price_delta: option.price_delta || 0,
      })),
    });
  }

  return groups;
};

export const getDefaultOptionSelections = (product) =>
  ensureValidOptionSelections(product);

export const getSelectedProductOptions = (product, selections = {}, pathConfig = {}) => {
  const { transmission, cylinderVolume } = resolveSelectedPath(
    product,
    selections,
    pathConfig
  );
  const selectedOptions = [];

  if (transmission && !transmission.hidden) {
    selectedOptions.push({
      group_key: "transmission",
      title_key: "productOptions.transmission",
      id: transmission.id,
      label: transmission.label,
      price_delta: transmission.price_delta || 0,
    });
  }

  if (cylinderVolume) {
    selectedOptions.push({
      group_key: "cylinder_volume",
      title_key: "productOptions.cylinderVolume",
      id: cylinderVolume.id,
      label: cylinderVolume.label,
      count: normalizeCylinderCount(cylinderVolume.count),
      price_delta: cylinderVolume.price_delta || 0,
    });
  }

  return selectedOptions;
};

export const calculateConfiguredPrice = (product, locale, selections = {}, pathConfig = {}) => {
  const { transmission, cylinderVolume } = resolveSelectedPath(
    product,
    selections,
    pathConfig
  );
  const transmissionPrice = transmission
    ? parseNumericPrice(transmission?.price_delta)
    : null;
  const cylinderPrice = cylinderVolume
    ? parseNumericPrice(cylinderVolume?.price_delta)
    : null;

  // Avtomat / mexanika narxi balon hajmi narxi ustiga qo‘shiladi
  if (transmission && cylinderVolume) {
    if (transmissionPrice === null && cylinderPrice === null) {
      return getProductDefaultPrice(product, locale);
    }
    const tx = transmissionPrice !== null ? transmissionPrice : 0;
    const cx = cylinderPrice !== null ? cylinderPrice : 0;
    return tx + cx;
  }

  if (cylinderVolume && cylinderPrice !== null) {
    return cylinderPrice;
  }

  if (transmission && transmissionPrice !== null) {
    return transmissionPrice;
  }

  return getProductDefaultPrice(product, locale);
};

export const getProductOptionSummary = (product) => {
  const config = getNormalizedConfig(product?.config_options);
  const fuelTypes = toVisibleOptions(config.fuel_types);
  const transmissions = config.fuel_types.flatMap((fuelType) =>
    toVisibleOptions(fuelType.transmissions)
  );
  const cylinderVolumes = config.fuel_types.flatMap((fuelType) =>
    fuelType.transmissions.flatMap((transmission) => transmission.cylinder_volumes || [])
  );

  return {
    fuelTypeCount: fuelTypes.length,
    transmissionCount: transmissions.length,
    cylinderVolumeCount: cylinderVolumes.length,
  };
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

export const buildConfiguredBasketItem = (
  product,
  selections = {},
  quantity = 1,
  pathConfig = {}
) => {
  const normalizedSelections =
    pathConfig.useFallbackPath === false
      ? { ...(selections || {}) }
      : ensureValidOptionSelections(product, selections);
  const selectedOptions = getSelectedProductOptions(
    product,
    normalizedSelections,
    pathConfig
  );

  return {
    ...product,
    quantity,
    selected_options: selectedOptions,
    selected_price_uz: calculateConfiguredPrice(product, "uz", normalizedSelections, pathConfig),
    selected_price_ru: calculateConfiguredPrice(product, "ru", normalizedSelections, pathConfig),
    selected_price_en: calculateConfiguredPrice(product, "en", normalizedSelections, pathConfig),
    basket_key: buildBasketKey(product.id, selectedOptions),
  };
};

export const getBasketPrice = (item, locale) =>
  item?.[`selected_price_${locale}`] ?? item?.[`price_${locale}`] ?? "";

const normalizeCreditPlan = (plan) => {
  if (!plan || typeof plan !== "object") {
    return null;
  }

  const months = parseNumericPrice(plan.months);
  const percent = parsePercentValue(plan.percent);

  if (
    months === null ||
    percent === null ||
    !Number.isFinite(months) ||
    !Number.isFinite(percent) ||
    months <= 0
  ) {
    return null;
  }

  return {
    months,
    percent,
  };
};

export const getCreditPlans = (product) => {
  if (!product?.credit_enabled) {
    return [];
  }

  let sourcePlans = product?.credit_plans;
  if (typeof sourcePlans === "string") {
    try {
      sourcePlans = JSON.parse(sourcePlans);
    } catch {
      sourcePlans = [];
    }
  }

  const normalizedPlans = [];
  const seenMonths = new Set();

  if (Array.isArray(sourcePlans)) {
    sourcePlans.forEach((plan) => {
      const normalizedPlan = normalizeCreditPlan(plan);
      if (!normalizedPlan || seenMonths.has(normalizedPlan.months)) {
        return;
      }

      normalizedPlans.push(normalizedPlan);
      seenMonths.add(normalizedPlan.months);
    });
  }

  const appendLegacyPlan = (monthsValue, percentValue) => {
    const normalizedPlan = normalizeCreditPlan({
      months: monthsValue,
      percent: percentValue,
    });

    if (!normalizedPlan || seenMonths.has(normalizedPlan.months)) {
      return;
    }

    normalizedPlans.push(normalizedPlan);
    seenMonths.add(normalizedPlan.months);
  };

  appendLegacyPlan(product?.credit_months, product?.credit_percent);
  appendLegacyPlan(6, product?.credit_6m_percent);

  return normalizedPlans.sort((a, b) => a.months - b.months);
};

export const hasCreditPricing = (product) =>
  getCreditPlans(product).length > 0;

export const getCreditConfig = (product) => {
  return getCreditPlans(product)[0] || null;
};

export const getInstallmentPlan = (product, locale = "uz", months = 12) => {
  const targetMonths = Number(months);
  if (!Number.isFinite(targetMonths) || targetMonths <= 0) {
    return null;
  }

  const basePrice = parseNumericPrice(getProductDefaultPrice(product, locale));
  if (basePrice === null) {
    return null;
  }

  const creditPlan = getCreditPlans(product).find((plan) => plan.months === targetMonths);
  if (!creditPlan) {
    return null;
  }

  return calculateCreditPlan(basePrice, creditPlan.percent, creditPlan.months);
};

export const calculateCreditPlan = (basePrice, totalPercent, months) => {
  const numericBasePrice =
    typeof basePrice === "number" ? basePrice : parseNumericPrice(basePrice);
  const numericPercent = parsePercentValue(totalPercent);

  if (
    numericBasePrice === null ||
    numericPercent === null ||
    !Number.isFinite(months) ||
    months <= 0
  ) {
    return null;
  }

  const total = Math.round(numericBasePrice * (1 + numericPercent / 100));
  const monthlyPayment = Math.round(total / months);

  return {
    months,
    total,
    monthlyPayment,
    appliedPercent: numericPercent,
  };
};
