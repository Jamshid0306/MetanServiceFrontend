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

const CONFIG_SCHEMA_VERSION = 3;
const DEFAULT_FUEL_TYPE_LABEL = "Standart";
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

const resolveSelectedPath = (product, selections = {}) => {
  const config = getNormalizedConfig(product?.config_options);
  const fuelType =
    findOptionById(config.fuel_types, selections.fuel_type) || config.fuel_types[0] || null;
  const transmissions = fuelType?.transmissions || [];
  const transmission =
    findOptionById(transmissions, selections.transmission) || transmissions[0] || null;
  const generations = transmission?.generations || [];
  const generation = findOptionById(generations, selections.generation) || generations[0] || null;
  const cylinderVolumes = generation?.cylinder_volumes || [];
  const cylinderVolume =
    findOptionById(cylinderVolumes, selections.cylinder_volume) || cylinderVolumes[0] || null;

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

export const normalizeProductOptions = (rawOptions = {}) => getNormalizedConfig(rawOptions);

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

export const getProductOptionGroups = (product, selections = {}) => {
  const { config, fuelType, transmission, generation } = resolveSelectedPath(
    product,
    selections
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
        price_delta: option.price_delta || 0,
      })),
    });
  }

  return groups;
};

export const getDefaultOptionSelections = (product) =>
  ensureValidOptionSelections(product);

export const getSelectedProductOptions = (product, selections = {}) => {
  const { fuelType, transmission, generation, cylinderVolume } = resolveSelectedPath(
    product,
    selections
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
      price_delta: cylinderVolume.price_delta || 0,
    });
  }

  return selectedOptions;
};

export const calculateConfiguredPrice = (product, locale, selections = {}) => {
  const { cylinderVolume } = resolveSelectedPath(product, selections);
  const configuredPrice = parseNumericPrice(cylinderVolume?.price_delta);
  if (configuredPrice !== null) {
    return configuredPrice;
  }

  const basePrice = parseNumericPrice(product?.[`price_${locale}`]);
  if (basePrice === null) {
    return product?.[`price_${locale}`] || "";
  }

  return basePrice;
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
