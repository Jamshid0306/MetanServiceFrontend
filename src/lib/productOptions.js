export const PRODUCT_OPTION_GROUPS = [
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

const CONFIG_SCHEMA_VERSION = 2;
const DEFAULT_TRANSMISSION_LABEL = "Standart";
const DEFAULT_GENERATION_LABEL = "Standart";

const createOptionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `option-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toOptionId = (value, fallback) => String(value || fallback).trim();

const normalizePriceDelta = (value) => parseNumericPrice(value) ?? 0;

const normalizeCylinderVolumeItem = (option = {}, index = 0, prefix = "cylinder-volume") => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return null;
  }

  return {
    id: toOptionId(option?.id, `${prefix}-${index + 1}`),
    label,
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
    return legacyTransmissions;
  }

  if (fallbackGenerations.length) {
    return [createSyntheticTransmission(fallbackGenerations)];
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

  const transmissions = Array.isArray(source.transmissions)
    ? normalizeTransmissionList(source.transmissions)
    : normalizeLegacyConfig(source);

  return {
    schema_version: CONFIG_SCHEMA_VERSION,
    transmissions,
  };
};

const findOptionById = (options = [], optionId = "") =>
  options.find((option) => option.id === optionId) || null;

const toVisibleOptions = (options = []) => options.filter((option) => !option.hidden);

const resolveSelectedPath = (product, selections = {}) => {
  const config = getNormalizedConfig(product?.config_options);
  const transmission = findOptionById(config.transmissions, selections.transmission) || config.transmissions[0] || null;
  const generations = transmission?.generations || [];
  const generation = findOptionById(generations, selections.generation) || generations[0] || null;
  const cylinderVolumes = generation?.cylinder_volumes || [];
  const cylinderVolume =
    findOptionById(cylinderVolumes, selections.cylinder_volume) || cylinderVolumes[0] || null;

  return {
    config,
    transmission,
    generation,
    cylinderVolume,
  };
};

export const createEmptyCylinderVolumeItem = () => ({
  id: createOptionId(),
  label: "",
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

export const createEmptyProductOptions = () => ({
  schema_version: CONFIG_SCHEMA_VERSION,
  transmissions: [],
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

export const normalizeProductOptions = (rawOptions = {}) => getNormalizedConfig(rawOptions);

export const serializeProductOptions = (rawOptions = {}) => {
  const normalized = getNormalizedConfig(rawOptions);

  return {
    schema_version: CONFIG_SCHEMA_VERSION,
    transmissions: normalized.transmissions.map((transmission) => ({
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
          price_delta: volume.price_delta || 0,
        })),
      })),
    })),
  };
};

export const hasConfigurableOptions = (product) => {
  const config = getNormalizedConfig(product?.config_options);

  return (
    config.transmissions.some((transmission) => !transmission.hidden) ||
    config.transmissions.some((transmission) =>
      transmission.generations.some((generation) => !generation.hidden)
    ) ||
    config.transmissions.some((transmission) =>
      transmission.generations.some((generation) => generation.cylinder_volumes.length > 0)
    )
  );
};

export const ensureValidOptionSelections = (product, selections = {}) => {
  const { transmission, generation, cylinderVolume } = resolveSelectedPath(product, selections);
  const nextSelections = {};

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

export const getProductOptionGroups = (product, selections = {}) => {
  const { config, transmission, generation } = resolveSelectedPath(product, selections);
  const groups = [];
  const visibleTransmissions = toVisibleOptions(config.transmissions);

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
        price_delta: option.price_delta || 0,
      })),
    });
  }

  return groups;
};

export const getDefaultOptionSelections = (product) =>
  ensureValidOptionSelections(product);

export const getSelectedProductOptions = (product, selections = {}) => {
  const { transmission, generation, cylinderVolume } = resolveSelectedPath(product, selections);
  const selectedOptions = [];

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
      price_delta: cylinderVolume.price_delta || 0,
    });
  }

  return selectedOptions;
};

export const calculateConfiguredPrice = (product, locale, selections = {}) => {
  const basePrice = parseNumericPrice(product?.[`price_${locale}`]);
  if (basePrice === null) {
    return product?.[`price_${locale}`] || "";
  }

  const { cylinderVolume } = resolveSelectedPath(product, selections);
  const totalDelta = cylinderVolume?.price_delta || 0;

  return basePrice + totalDelta;
};

export const getProductOptionSummary = (product) => {
  const config = getNormalizedConfig(product?.config_options);
  const transmissions = toVisibleOptions(config.transmissions);
  const generations = config.transmissions.flatMap((transmission) =>
    toVisibleOptions(transmission.generations)
  );
  const cylinderVolumes = config.transmissions.flatMap((transmission) =>
    transmission.generations.flatMap((generation) => generation.cylinder_volumes)
  );

  return {
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

export const buildConfiguredBasketItem = (product, selections = {}, quantity = 1) => {
  const normalizedSelections = ensureValidOptionSelections(product, selections);
  const selectedOptions = getSelectedProductOptions(product, normalizedSelections);

  return {
    ...product,
    quantity,
    selected_options: selectedOptions,
    selected_price_uz: calculateConfiguredPrice(product, "uz", normalizedSelections),
    selected_price_ru: calculateConfiguredPrice(product, "ru", normalizedSelections),
    selected_price_en: calculateConfiguredPrice(product, "en", normalizedSelections),
    basket_key: buildBasketKey(product.id, selectedOptions),
  };
};

export const getBasketPrice = (item, locale) =>
  item?.[`selected_price_${locale}`] ?? item?.[`price_${locale}`] ?? "";

export const hasCreditPricing = (product) =>
  getCreditConfig(product) !== null;

export const getCreditConfig = (product) => {
  if (!product?.credit_enabled) {
    return null;
  }

  const legacyPercent = parsePercentValue(product?.credit_6m_percent);
  const percent = parsePercentValue(product?.credit_percent);
  const resolvedPercent = percent ?? legacyPercent;
  const months =
    parseNumericPrice(product?.credit_months) ?? (resolvedPercent !== null ? 6 : null);

  if (
    resolvedPercent === null ||
    months === null ||
    !Number.isFinite(months) ||
    months <= 0
  ) {
    return null;
  }

  return {
    months,
    percent: resolvedPercent,
  };
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
