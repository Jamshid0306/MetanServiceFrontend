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
    key: "generation",
    titleKey: "productOptions.generation",
  },
  {
    key: "cylinder_volume",
    titleKey: "productOptions.cylinderVolume",
  },
];

export const CREDIT_MONTH_OPTIONS = [3, 6, 9, 12];

const CONFIG_SCHEMA_VERSION = 4;
const DEFAULT_FUEL_TYPE_LABEL = "Standart";
const DEFAULT_TRANSMISSION_LABEL = "Standart";
const DEFAULT_GENERATION_LABEL = "Standart";
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

const normalizeGenerationItem = (
  option = {},
  index = 0,
  prefix = "generation",
  fallbackVolumes = []
) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return null;
  }

  const optionId = toOptionId(option?.id, `${prefix}-${index + 1}`);
  const rawVolumes = Array.isArray(option?.cylinder_volumes)
    ? option.cylinder_volumes
    : fallbackVolumes;

  return {
    id: optionId,
    label,
    hidden: Boolean(option?.hidden),
    price_delta: normalizePriceDelta(option?.price_delta),
    cylinder_volumes: normalizeCylinderVolumeList(rawVolumes, `${optionId}-volume`),
  };
};

const normalizeGenerationList = (
  rawOptions = [],
  prefix = "generation",
  fallbackVolumes = []
) =>
  (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option, index) =>
      normalizeGenerationItem(option, index, prefix, fallbackVolumes)
    )
    .filter(Boolean);

const normalizeTransmissionItem = (
  option = {},
  index = 0,
  prefix = "transmission",
  fallbackGenerations = []
) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return null;
  }

  const optionId = toOptionId(option?.id, `${prefix}-${index + 1}`);
  const rawGenerations = Array.isArray(option?.generations)
    ? option.generations
    : fallbackGenerations;

  return {
    id: optionId,
    label,
    hidden: Boolean(option?.hidden),
    price_delta: normalizePriceDelta(option?.price_delta),
    generations: normalizeGenerationList(rawGenerations, `${optionId}-generation`),
  };
};

const normalizeTransmissionList = (
  rawOptions = [],
  prefix = "transmission",
  fallbackGenerations = []
) =>
  (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option, index) =>
      normalizeTransmissionItem(option, index, prefix, fallbackGenerations)
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

const createSyntheticGeneration = (volumes = []) => ({
  id: "generation-default",
  label: DEFAULT_GENERATION_LABEL,
  hidden: true,
  price_delta: 0,
  cylinder_volumes: normalizeCylinderVolumeList(volumes, "generation-default-volume"),
});

const createSyntheticTransmission = (generations = []) => ({
  id: "transmission-default",
  label: DEFAULT_TRANSMISSION_LABEL,
  hidden: true,
  price_delta: 0,
  generations: normalizeGenerationList(generations, "transmission-default-generation"),
});

const createSyntheticFuelType = (transmissions = []) => ({
  id: "fuel-type-default",
  label: DEFAULT_FUEL_TYPE_LABEL,
  hidden: true,
  transmissions: normalizeTransmissionList(transmissions, "fuel-type-default-transmission"),
});

const normalizeLegacyConfig = (source = {}) => {
  const legacyVolumes = normalizeCylinderVolumeList(source?.cylinder_volume, "legacy-volume");
  const legacyGenerations = normalizeGenerationList(
    source?.cylinder_position,
    "legacy-generation",
    legacyVolumes
  );
  const fallbackGenerations = legacyGenerations.length
    ? legacyGenerations
    : legacyVolumes.length
      ? [createSyntheticGeneration(legacyVolumes)]
      : [];
  const legacyTransmissions = normalizeTransmissionList(
    source?.transmission,
    "legacy-transmission",
    fallbackGenerations
  );

  if (legacyTransmissions.length) {
    return [createSyntheticFuelType(legacyTransmissions)];
  }

  if (fallbackGenerations.length) {
    return [createSyntheticFuelType([createSyntheticTransmission(fallbackGenerations)])];
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
  const fuelType = resolveOptionFromSelection(
    config.fuel_types,
    selections.fuel_type,
    pathConfig
  );
  const transmissions = fuelType?.transmissions || [];
  const transmission = resolveOptionFromSelection(
    transmissions,
    selections.transmission,
    pathConfig
  );
  const generations = transmission?.generations || [];
  const generation = resolveOptionFromSelection(
    generations,
    selections.generation,
    pathConfig
  );
  const cylinderVolumes = generation?.cylinder_volumes || [];
  const cylinderVolume = resolveOptionFromSelection(
    cylinderVolumes,
    selections.cylinder_volume,
    pathConfig
  );

  return {
    config,
    fuelType,
    transmission,
    generation,
    cylinderVolume,
  };
};

export const createEmptyCylinderVolumeItem = () => ({
  id: createOptionId(),
  label: "",
  count: "1",
  price_delta: "",
});

export const createEmptyGenerationItem = () => ({
  id: createOptionId(),
  label: "",
  price_delta: "",
  cylinder_volumes: [],
});

export const createEmptyTransmissionItem = () => ({
  id: createOptionId(),
  label: "",
  price_delta: "",
  generations: [],
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
        price_delta: 0,
        generations: transmission.generations.map((generation) => ({
          id: generation.id || createOptionId(),
          label: generation.label,
          hidden: Boolean(generation.hidden),
          price_delta: 0,
          cylinder_volumes: generation.cylinder_volumes.map((volume) => ({
            id: volume.id || createOptionId(),
            label: volume.label,
            count: normalizeCylinderCount(volume.count),
            price_delta: volume.price_delta || 0,
          })),
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
        transmission.generations.some((generation) => !generation.hidden)
      )
    ) ||
    config.fuel_types.some((fuelType) =>
      fuelType.transmissions.some((transmission) =>
        transmission.generations.some((generation) => generation.cylinder_volumes.length > 0)
      )
    )
  );
};

export const ensureValidOptionSelections = (product, selections = {}) => {
  const { fuelType, transmission, generation, cylinderVolume } = resolveSelectedPath(
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

  if (generation) {
    nextSelections.generation = generation.id;
  }

  if (cylinderVolume) {
    nextSelections.cylinder_volume = cylinderVolume.id;
  }

  return nextSelections;
};

export const getProductOptionGroups = (product, selections = {}, pathConfig = {}) => {
  const { config, fuelType, transmission, generation } = resolveSelectedPath(
    product,
    selections,
    pathConfig
  );
  const groups = [];
  const visibleFuelTypes = toVisibleOptions(config.fuel_types);

  if (visibleFuelTypes.length) {
    groups.push({
      key: "fuel_type",
      titleKey: "productOptions.fuelType",
      options: visibleFuelTypes.map((option) => ({
        id: option.id,
        label: option.label,
        price_delta: 0,
      })),
    });
  }

  const visibleTransmissions = toVisibleOptions(fuelType?.transmissions || []);

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

  const visibleGenerations = toVisibleOptions(transmission?.generations || []);
  if (visibleGenerations.length) {
    groups.push({
      key: "generation",
      titleKey: "productOptions.generation",
      options: visibleGenerations.map((option) => ({
        id: option.id,
        label: option.label,
        price_delta: 0,
      })),
    });
  }

  const cylinderVolumes = generation?.cylinder_volumes || [];
  if (cylinderVolumes.length) {
    groups.push({
      key: "cylinder_volume",
      titleKey: "productOptions.cylinderVolume",
      options: cylinderVolumes.map((option) => ({
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
  const { fuelType, transmission, generation, cylinderVolume } = resolveSelectedPath(
    product,
    selections,
    pathConfig
  );
  const selectedOptions = [];

  if (fuelType && !fuelType.hidden) {
    selectedOptions.push({
      group_key: "fuel_type",
      title_key: "productOptions.fuelType",
      id: fuelType.id,
      label: fuelType.label,
      price_delta: 0,
    });
  }

  if (transmission && !transmission.hidden) {
    selectedOptions.push({
      group_key: "transmission",
      title_key: "productOptions.transmission",
      id: transmission.id,
      label: transmission.label,
      price_delta: 0,
    });
  }

  if (generation && !generation.hidden) {
    selectedOptions.push({
      group_key: "generation",
      title_key: "productOptions.generation",
      id: generation.id,
      label: generation.label,
      price_delta: 0,
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
  const { cylinderVolume } = resolveSelectedPath(product, selections, pathConfig);
  const configuredPrice = parseNumericPrice(cylinderVolume?.price_delta);
  if (configuredPrice !== null) {
    return configuredPrice;
  }

  return getProductDefaultPrice(product, locale);
};

export const getProductOptionSummary = (product) => {
  const config = getNormalizedConfig(product?.config_options);
  const fuelTypes = toVisibleOptions(config.fuel_types);
  const transmissions = config.fuel_types.flatMap((fuelType) =>
    toVisibleOptions(fuelType.transmissions)
  );
  const generations = config.fuel_types.flatMap((fuelType) =>
    fuelType.transmissions.flatMap((transmission) =>
      toVisibleOptions(transmission.generations)
    )
  );
  const cylinderVolumes = config.fuel_types.flatMap((fuelType) =>
    fuelType.transmissions.flatMap((transmission) =>
      transmission.generations.flatMap((generation) => generation.cylinder_volumes)
    )
  );

  return {
    fuelTypeCount: fuelTypes.length,
    transmissionCount: transmissions.length,
    generationCount: generations.length,
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

  const basePrice = parseNumericPrice(product?.[`price_${locale}`]);
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
