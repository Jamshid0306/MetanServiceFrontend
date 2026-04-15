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

const CONFIG_SCHEMA_VERSION = 6;
const DEFAULT_FUEL_TYPE_LABEL = "Standart";
const DEFAULT_TRANSMISSION_LABEL = "Standart";
const ASK_PRICE_BY_LOCALE = {
  uz: "Narxni so’rang",
  ru: "Цену уточняйте",
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

const isAutoTransmissionLabel = (label = "") => {
  const s = String(label || "")
    .trim()
    .toLowerCase();
  return (
    s.includes("avtomat") ||
    s.includes("автомат") ||
    s.includes("automatic") ||
    s.includes("auto")
  );
};

const isManualTransmissionLabel = (label = "") => {
  const s = String(label || "")
    .trim()
    .toLowerCase();
  return (
    s.includes("mexanika") ||
    s.includes("mehanika") ||
    s.includes("manual") ||
    s.includes("механика") ||
    s.includes("mechanic")
  );
};

const inferGearboxFromNormalizedTransmissions = (transmissions = []) => {
  const auto = transmissions.find((t) => isAutoTransmissionLabel(t?.label));
  const manual = transmissions.find((t) => isManualTransmissionLabel(t?.label));
  if (auto && manual) {
    return {
      enabled: true,
      automatic_price_delta: normalizePriceDelta(auto?.price_delta),
      manual_price_delta: normalizePriceDelta(manual?.price_delta),
    };
  }
  return { enabled: false, automatic_price_delta: 0, manual_price_delta: 0 };
};

const mergeCylinderVolumesFromTransmissionsRaw = (transmissions = []) => {
  const merged = (Array.isArray(transmissions) ? transmissions : []).flatMap((tr) =>
    collectRawCylinderVolumesFromTransmission(tr || {}, [])
  );
  return dedupeOptionsById(merged);
};

const buildTransmissionsFromFuelShape = (
  optionId,
  volumesNormalized,
  gearboxEnabled,
  autoDelta,
  manualDelta
) => {
  const vols = Array.isArray(volumesNormalized) ? volumesNormalized : [];
  const dup = () => vols.map((v) => ({ ...v }));

  if (gearboxEnabled) {
    return [
      normalizeTransmissionItem(
        {
          id: `${optionId}-gearbox-auto`,
          label: "Avtomat",
          hidden: false,
          price_delta: autoDelta,
          cylinder_volumes: dup(),
        },
        0,
        `${optionId}-trans`
      ),
      normalizeTransmissionItem(
        {
          id: `${optionId}-gearbox-manual`,
          label: "Mexanika",
          hidden: false,
          price_delta: manualDelta,
          cylinder_volumes: dup(),
        },
        1,
        `${optionId}-trans`
      ),
    ].filter(Boolean);
  }

  return [
    normalizeTransmissionItem(
      {
        id: `${optionId}-gearbox-off`,
        label: DEFAULT_TRANSMISSION_LABEL,
        hidden: false,
        price_delta: 0,
        cylinder_volumes: dup(),
      },
      0,
      `${optionId}-trans`
    ),
  ].filter(Boolean);
};

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

  let volumesNormalized = [];
  let gearboxEnabled = false;
  let automaticPriceDelta = 0;
  let manualPriceDelta = 0;

  const hasFuelLevelVolumes =
    Array.isArray(option?.cylinder_volumes) && option.cylinder_volumes.length > 0;

  if (hasFuelLevelVolumes) {
    volumesNormalized = normalizeCylinderVolumeList(
      option.cylinder_volumes,
      `${optionId}-volume`
    );
    gearboxEnabled = Boolean(option.gearbox_program_enabled);
    automaticPriceDelta = normalizePriceDelta(option.automatic_price_delta);
    manualPriceDelta = normalizePriceDelta(option.manual_price_delta);
  } else if (Array.isArray(option?.transmissions) && option.transmissions.length) {
    const rawTrs = option.transmissions;
    const mergedRaw = mergeCylinderVolumesFromTransmissionsRaw(rawTrs);
    volumesNormalized = normalizeCylinderVolumeList(mergedRaw, `${optionId}-volume`);
    const normalizedTrs = normalizeTransmissionList(rawTrs, `${optionId}-legacy-trans`);
    const inferred = inferGearboxFromNormalizedTransmissions(normalizedTrs);
    gearboxEnabled = inferred.enabled;
    automaticPriceDelta = inferred.automatic_price_delta;
    manualPriceDelta = inferred.manual_price_delta;
  } else if (Array.isArray(fallbackTransmissions) && fallbackTransmissions.length) {
    return normalizeFuelTypeItem(
      { ...option, transmissions: fallbackTransmissions },
      index,
      prefix,
      []
    );
  }

  const transmissions = buildTransmissionsFromFuelShape(
    optionId,
    volumesNormalized,
    gearboxEnabled,
    automaticPriceDelta,
    manualPriceDelta
  );

  return {
    id: optionId,
    label,
    hidden: Boolean(option?.hidden),
    gearbox_program_enabled: gearboxEnabled,
    automatic_price_delta: automaticPriceDelta,
    manual_price_delta: manualPriceDelta,
    transmissions,
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
  hidden: false,
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
  let transmission = resolveOptionFromSelection(
    allTransmissions,
    selections.transmission,
    pathConfig
  );

  if (!transmission && allTransmissions.length === 1) {
    transmission = allTransmissions[0];
  }

  let fuelType = resolveOptionFromSelection(
    config.fuel_types,
    selections.fuel_type,
    pathConfig
  );
  if (!fuelType && transmission) {
    fuelType = resolveFuelTypeContainingTransmission(config, transmission.id);
  }

  const primaryTransmissionForVolumes =
    transmission || (allTransmissions.length ? allTransmissions[0] : null);
  const cylinderVolumesMerged =
    mergeCylinderVolumesForTransmission(primaryTransmissionForVolumes);
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
  cylinder_volumes: [],
  gearbox_program_enabled: false,
  automatic_price_delta: "",
  manual_price_delta: "",
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

export const parseDecimalNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value).replace(",", ".");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const numeric = Number(match[0]);
  return Number.isNaN(numeric) ? null : numeric;
};

export const parsePercentValue = (value) => {
  const numeric = parseDecimalNumber(value);
  return numeric === null || Number.isNaN(numeric) ? null : numeric;
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

const getProductConfiguredDefaultPrice = (product) => {
  const defaultPrice = String(product?.default_price || "").trim();
  if (!defaultPrice) {
    return null;
  }

  const numericDefaultPrice = parseNumericPrice(defaultPrice);
  return numericDefaultPrice === null ? defaultPrice : numericDefaultPrice;
};

export const getProductDefaultPrice = (product, locale = "uz") => {
  const localizedPrice = product?.[`price_${locale}`];

  // Catalog/home narxi gearbox tanlovi bo‘lmasdan (faqat balon hajmi) ko‘rsatilishi kerak,
  // shuning uchun `price_${locale}` ni birinchi o‘rinda ishlatamiz.
  if (
    localizedPrice !== null &&
    localizedPrice !== undefined &&
    localizedPrice !== ""
  ) {
    const numericLocalizedPrice = parseNumericPrice(localizedPrice);
    if (numericLocalizedPrice === null) return localizedPrice;

    // Agar backend/admin noto‘g‘ri qilib gearbox addon (avtomat/mehanika) qo‘shib yuborgan bo‘lsa,
    // config_options asosida "gearMin" ni aniqlab, bazaga qaytaramiz.
    const cfg = product?.config_options ? normalizeProductOptions(product.config_options) : null;
    const fuelTypes = Array.isArray(cfg?.fuel_types) ? cfg.fuel_types : [];

    if (!fuelTypes.length) return numericLocalizedPrice;

    const safeMin = (a, b) => (a === null ? b : Math.min(a, b));

    let baseMin = null; // faqat cylinder (gearboxsiz) minimal narx
    let withGearMin = null; // oldin saqlangan bo‘lishi mumkin: cylinder + min(automatic, manual)

    for (const ft of fuelTypes) {
      const gb = Boolean(ft?.gearbox_program_enabled);
      const auto = parseNumericPrice(ft?.automatic_price_delta);
      const manual = parseNumericPrice(ft?.manual_price_delta);

      // admin oldin shunday qo‘shgan:
      // - agar auto va manual bo‘lsa min(auto, manual)
      // - aks holda mavjud bittasini olgan (yo‘q bo‘lsa 0)
      const gearMin = gb
        ? auto !== null && manual !== null
          ? Math.min(auto, manual)
          : (auto ?? manual ?? 0)
        : 0;

      const transmissions = Array.isArray(ft?.transmissions) ? ft.transmissions : [];
      const cylinderVolumes = transmissions.flatMap((tr) =>
        Array.isArray(tr?.cylinder_volumes) ? tr.cylinder_volumes : []
      );

      let cylinderMin = null;
      for (const v of cylinderVolumes) {
        const vPrice = parseNumericPrice(v?.price_delta);
        if (vPrice === null) continue;
        cylinderMin = safeMin(cylinderMin, vPrice);
      }

      if (cylinderMin === null) continue;

      baseMin = safeMin(baseMin, cylinderMin);
      withGearMin = safeMin(withGearMin, cylinderMin + gearMin);
    }

    // Agar price aynan (cylinderMin + gearMin) ko‘rinishida bo‘lsa, bazaga qaytaramiz.
    if (baseMin !== null && withGearMin !== null) {
      const tolerance = 1; // float/tozalash farqlari bo‘lishi mumkin
      const diff = Math.abs(numericLocalizedPrice - withGearMin);
      if (diff <= tolerance) {
        return baseMin;
      }
    }

    return numericLocalizedPrice;
  }

  // Fallback sifatida admin kiritgan `default_price`.
  const configuredDefaultPrice = getProductConfiguredDefaultPrice(product);
  if (configuredDefaultPrice !== null) {
    return configuredDefaultPrice;
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
      cylinder_volumes: (fuelType.transmissions[0]?.cylinder_volumes || []).map((volume) => ({
        id: volume.id || createOptionId(),
        label: volume.label,
        count: normalizeCylinderCount(volume.count),
        price_delta: volume.price_delta || 0,
      })),
      gearbox_program_enabled: Boolean(fuelType.gearbox_program_enabled),
      automatic_price_delta: fuelType.automatic_price_delta ?? 0,
      manual_price_delta: fuelType.manual_price_delta ?? 0,
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
  const hasExplicitSelection = ["fuel_type", "transmission", "cylinder_volume"].some(
    (key) => {
      const value = selections?.[key];
      return value !== undefined && value !== null && String(value).trim() !== "";
    }
  );

  if (pathConfig.useFallbackPath === false && !hasExplicitSelection) {
    const configuredDefaultPrice = getProductConfiguredDefaultPrice(product);
    if (configuredDefaultPrice !== null) {
      return configuredDefaultPrice;
    }
  }

  const { transmission, cylinderVolume } = resolveSelectedPath(
    product,
    selections,
    pathConfig
  );
  const config = getNormalizedConfig(product?.config_options);
  const allTransmissions = getAllTransmissionsMerged(config);
  const gearboxOn = Boolean(config.fuel_types?.[0]?.gearbox_program_enabled);
  const gearboxProgramDeclined = Boolean(pathConfig.gearboxProgramDeclined);

  if (gearboxOn && allTransmissions.length > 1) {
    if (!cylinderVolume) {
      return getProductDefaultPrice(product, locale);
    }
    // "Ha" + balon tanlangan, lekin avtomat/mexanika hali yo'q — balon narxini saqlab turamiz
    // (default catalog narxi "yo'qolgan"dek ko'rinishining oldini oladi).
    if (!gearboxProgramDeclined && !transmission) {
      const pendingCylinderPrice = parseNumericPrice(cylinderVolume?.price_delta);
      if (pendingCylinderPrice !== null) {
        return pendingCylinderPrice;
      }
      return getProductDefaultPrice(product, locale);
    }
  }

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
    id: parseNumericPrice(plan.id),
    name: String(plan.name || "").trim(),
    months,
    percent,
    monthlyPercent: parsePercentValue(plan.monthly_percent),
    minAmount: parseNumericPrice(plan.min_amount),
    maxAmount: parseNumericPrice(plan.max_amount),
  };
};

const parseCreditSourcePlans = (sourcePlans) => {
  if (typeof sourcePlans === "string") {
    try {
      return JSON.parse(sourcePlans);
    } catch {
      return [];
    }
  }

  return Array.isArray(sourcePlans) ? sourcePlans : [];
};

const resolveCreditPlanAmount = (product, options = {}) => {
  const explicitAmount = parseNumericPrice(options?.amount);
  if (explicitAmount !== null) {
    return explicitAmount;
  }

  const locale = String(options?.locale || "uz").trim() || "uz";
  return parseNumericPrice(getProductDefaultPrice(product, locale));
};

const isCreditPlanAvailableForAmount = (plan, amount) => {
  if (!plan) {
    return false;
  }

  if (amount === null) {
    return true;
  }

  if (plan.minAmount !== null && Number.isFinite(plan.minAmount) && amount < plan.minAmount) {
    return false;
  }

  if (plan.maxAmount !== null && Number.isFinite(plan.maxAmount) && amount > plan.maxAmount) {
    return false;
  }

  return true;
};

export const getCreditPlans = (product, sharedPlans = null, options = {}) => {
  if (!product?.credit_enabled) {
    return [];
  }

  const normalizedPlans = [];
  const seenMonths = new Set();
  const amount = resolveCreditPlanAmount(product, options);
  const registerPlan = (plan) => {
    const normalizedPlan = normalizeCreditPlan(plan);
    if (
      !normalizedPlan ||
      seenMonths.has(normalizedPlan.months) ||
      !isCreditPlanAvailableForAmount(normalizedPlan, amount)
    ) {
      return;
    }

    normalizedPlans.push(normalizedPlan);
    seenMonths.add(normalizedPlan.months);
  };

  const externalPlans = Array.isArray(sharedPlans) ? sharedPlans : [];
  if (externalPlans.length) {
    externalPlans.forEach(registerPlan);
    if (normalizedPlans.length) {
      return normalizedPlans.sort((a, b) => a.months - b.months);
    }
  }

  const sourcePlans = parseCreditSourcePlans(product?.credit_plans);
  sourcePlans.forEach(registerPlan);

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

export const hasCreditPricing = (product, sharedPlans = null, options = {}) =>
  getCreditPlans(product, sharedPlans, options).length > 0;

export const getCreditConfig = (product, sharedPlans = null, options = {}) => {
  return getCreditPlans(product, sharedPlans, options)[0] || null;
};

export const getInstallmentPlan = (
  product,
  locale = "uz",
  months = 12,
  sharedPlans = null,
  options = {}
) => {
  const targetMonths = Number(months);
  if (!Number.isFinite(targetMonths) || targetMonths <= 0) {
    return null;
  }

  const basePrice = resolveCreditPlanAmount(product, {
    ...options,
    locale,
  });
  if (basePrice === null) {
    return null;
  }

  const creditPlan = getCreditPlans(product, sharedPlans, {
    ...options,
    locale,
  }).find(
    (plan) => plan.months === targetMonths
  );
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
