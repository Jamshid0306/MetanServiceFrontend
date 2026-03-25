<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import { useProductsStore } from "../store/productsStore";
import { useBasketStore } from "../store/basketStore";
import { ShoppingCart, Check, X, CircleHelp } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { Swiper, SwiperSlide } from "swiper/vue";
import { useRoute, useRouter } from "vue-router";
import "swiper/css";
import LeftArrow from "@/components/icons/LeftArrow.vue";
import { useLoaderStore } from "@/store/loaderStore";
import Notification from "@/components/Notification.vue";
import { apiClient, getApiErrorMessage, resolveAssetUrls } from "@/lib/api";
import {
  formatCustomerPhone,
  getStoredCustomerSession,
  normalizeCustomerPhone,
} from "@/lib/customerSession";
import {
  calculateCreditPlan,
  buildConfiguredBasketItem,
  calculateConfiguredPrice,
  formatCylinderCountLabel,
  formatCylinderOptionLabel,
  getProductDefaultPrice,
  formatPriceValue,
  getCreditPlans,
  hasCreditPricing,
  normalizeProductOptions,
  parseNumericPrice,
} from "@/lib/productOptions";

const router = useRouter();
const store = useProductsStore();
const getOptionFlow = () => {
  const cfg = normalizeProductOptions(store.product?.config_options);
  const ft = cfg?.fuel_types?.[0];
  return ft?.gearbox_program_enabled
    ? ["cylinder_volume", "transmission"]
    : ["cylinder_volume"];
};

const resolveDefaultBalloonProgramEnabled = () => {
  const cfg = normalizeProductOptions(store.product?.config_options);
  const ft = cfg?.fuel_types?.[0];
  // Dastlab Ha/Yo‘q ikkalasi ham tanlanmagan ko‘rinsin; foydalanuvchi bosmaguncha null.
  void ft;
  return null;
};

const basketStore = useBasketStore();
const { t, locale, tm } = useI18n();
const route = useRoute();
const detailAnimating = ref(false);
const detailShowCheck = ref(false);
const animating = ref({});
const showCheck = ref({});
const activeTab = ref("description");
const relatedProductRefs = ref([]);
const swiperRef = ref(null);
const summaryRef = ref(null);
const notification = ref({ show: false, message: "" });
const selectedOptions = ref({});
const selectedCreditMonths = ref(null);
/**
 * Programma xizmati: null = hali tanlanmagan, true = Ha, false = Yo'q.
 * - null / false: transmission narxi qo‘shilmaydi (null = savol javobsiz).
 * - true: avtomat/mexanika tanlanadi.
 */
const balloonProgramEnabled = ref(null);
const orderModalOpen = ref(false);
const fuelGuideModalOpen = ref(false);
const orderSubmitting = ref(false);
const orderError = ref("");
const orderForm = ref(createEmptyOrderForm());
const stickyPriceVisible = ref(false);
let swiperInstance = null;
let priceSummaryObserver = null;

function createEmptyOrderForm(orderType = "standard") {
  return {
    orderType,
    name: "",
    phone: "",
    tariffId: "",
    amount: "",
    initialPayment: "",
    period: "",
    startDate: "",
    passport: "",
    pinfl: "",
    lastName: "",
    firstName: "",
    middleName: "",
    gender: "",
    birthDate: "",
    regionId: "",
    districtId: "",
    phones: "",
  };
}

const getTodayIsoDate = () => {
  const now = new Date();
  const timezoneAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return timezoneAdjusted.toISOString().slice(0, 10);
};

const customerProfile = ref(getStoredCustomerSession());

const normalizeImages = (images) => resolveAssetUrls(images);
const formatPrice = (price) => formatPriceValue(price);
const getProductDisplayPrice = (product) =>
  getProductDefaultPrice(product, locale.value);
const fuelGuideSections = computed(() => {
  const sections = tm("productOptions.fuelGuide.sections");
  return Array.isArray(sections) ? sections : [];
});
const isAnyModalOpen = computed(
  () => orderModalOpen.value || fuelGuideModalOpen.value
);

const getCustomerOrderFields = (profile = customerProfile.value) => {
  return {
    name: String(profile?.name || "").trim(),
    phone: profile ? formatCustomerPhone(profile.phone) : "",
    phones: profile?.phone || "",
  };
};

const applyCustomerProfileToOrderForm = (profile = customerProfile.value) => {
  const customerFields = getCustomerOrderFields(profile);

  orderForm.value.name = customerFields.name;
  orderForm.value.phone = customerFields.phone;

  if (!orderForm.value.phones) {
    orderForm.value.phones = customerFields.phones;
  }
};
const formatCylinderOptionMeta = (option) => {
  const parts = [];

  if (option?.price_delta) {
    parts.push(formatPrice(option.price_delta));
  }

  return parts.join(" · ");
};
const formatSelectedOptionLabel = (option) => {
  const label = String(option?.label || "").trim();
  if (!label) {
    return "";
  }

  const countLabel = formatCylinderCountLabel(option?.count);
  if (option?.group_key === "cylinder_volume" && countLabel) {
    return formatCylinderOptionLabel(option);
  }

  return label;
};
const getOptionSelectPlaceholder = (groupKey) => {
  if (locale.value === "ru") {
    return "Выберите размер баллона";
  }

  if (locale.value === "en") {
    return "Select cylinder size";
  }

  return "Balon razmerini tanlang";
};
const formatSelectOptionLabel = (groupKey, option) => {
  if (groupKey === "cylinder_volume") {
    const optionLabel = formatCylinderOptionLabel(option);
    const optionMeta = formatCylinderOptionMeta(option);

    return optionMeta ? `${optionLabel} - ${optionMeta}` : optionLabel;
  }

  return option?.label || "";
};
const toVisibleOptions = (options = []) =>
  (Array.isArray(options) ? options : []).filter((option) => !option?.hidden);
const dedupeOptionsById = (options = []) => {
  const seen = new Set();

  return (Array.isArray(options) ? options : []).filter((option) => {
    const optionId = String(option?.id || "").trim();
    if (!optionId || seen.has(optionId)) {
      return false;
    }

    seen.add(optionId);
    return true;
  });
};

/**
 * Cylinder volumes bir xil "razmer" (label+count+price_delta) bo‘lsa ham backend turli `id` bilan yuborishi mumkin.
 * UI’da duplikatlar ko‘rinmasligi uchun signature bo‘yicha dedupe qilamiz.
 */
const dedupeCylinderVolumesBySignature = (options = []) => {
  const seen = new Set();

  return (Array.isArray(options) ? options : []).filter((option) => {
    const label = String(option?.label || "").trim();
    const count = Number(option?.count ?? 0);
    const priceDelta = Number(option?.price_delta ?? 0);

    const signature = `${label}|${count}|${priceDelta}`;
    if (!label || seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
};

const buildOptionPaths = (config = {}) => {
  const fuelTypes = Array.isArray(config?.fuel_types) ? config.fuel_types : [];

  return fuelTypes.flatMap((fuelType) => {
    const transmissions = Array.isArray(fuelType?.transmissions)
      ? fuelType.transmissions
      : [];

    if (!transmissions.length) {
      return [{ fuel_type: fuelType }];
    }

    return transmissions.flatMap((transmission) => {
      const cylinderVolumes = dedupeOptionsById(
        toVisibleOptions(
          Array.isArray(transmission?.cylinder_volumes) ? transmission.cylinder_volumes : []
        )
      );

      if (!cylinderVolumes.length) {
        return [{ fuel_type: fuelType, transmission }];
      }

      return cylinderVolumes.map((cylinderVolume) => ({
        fuel_type: fuelType,
        transmission,
        cylinder_volume: cylinderVolume,
      }));
    });
  });
};
const findPathByOptionId = (paths = [], groupKey, optionId, context = {}) => {
  const tid = context.transmissionId;
  const cid = context.cylinderVolumeId;
  if (groupKey === "cylinder_volume" && tid) {
    const oid = String(optionId || "").trim();
    const tidStr = String(tid || "").trim();
    return (
      paths.find(
        (path) =>
          String(path?.cylinder_volume?.id || "").trim() === oid &&
          String(path?.transmission?.id || "").trim() === tidStr
      ) || null
    );
  }
  if (groupKey === "transmission" && cid) {
    const oid = String(optionId || "").trim();
    const cidStr = String(cid || "").trim();
    const byBoth = paths.find(
      (path) =>
        String(path?.transmission?.id || "").trim() === oid &&
        String(path?.cylinder_volume?.id || "").trim() === cidStr
    );
    if (byBoth) {
      return byBoth;
    }
  }
  const oid = String(optionId || "").trim();
  return (
    paths.find(
      (path) => String(path?.[groupKey]?.id || "").trim() === oid
    ) || null
  );
};
const getDeepestSelectedGroup = (selections = {}) =>
  [...getOptionFlow()].reverse().find((key) => Boolean(selections?.[key])) || null;
const prunePathToGroup = (path = {}, groupKey) => {
  const nextPath = {};
  if (path?.fuel_type) {
    nextPath.fuel_type = path.fuel_type;
  }

  for (const key of getOptionFlow()) {
    if (!path?.[key]) {
      break;
    }

    nextPath[key] = path[key];

    if (key === groupKey) {
      break;
    }
  }

  return nextPath;
};
const mapPathToSelections = (path = null) => {
  const nextSelections = {};
  if (path?.fuel_type?.id) {
    nextSelections.fuel_type = path.fuel_type.id;
  }
  for (const key of getOptionFlow()) {
    if (path?.[key]?.id) {
      nextSelections[key] = path[key].id;
    }
  }
  return nextSelections;
};
const resolveSingleVisibleOption = (options = []) => {
  const visibleOptions = dedupeOptionsById(toVisibleOptions(options));
  return visibleOptions.length === 1 ? visibleOptions[0] : null;
};
const mapOptionForDisplay = (option) => ({
  id: option.id,
  label: option.label,
  count: option.count,
  price_delta: option.price_delta || 0,
});
const normalizeTransmissionLabel = (label = "") =>
  String(label)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
const hasTransmissionChoice = (options = [], variants = []) =>
  (Array.isArray(options) ? options : []).some((option) => {
    const normalizedLabel = normalizeTransmissionLabel(option?.label);

    return variants.some((variant) => normalizedLabel.includes(variant));
  });
const shouldShowTransmissionOptions = (options = []) => {
  const cfg = normalizeProductOptions(store.product?.config_options);
  const ft = cfg?.fuel_types?.[0];
  if (ft?.gearbox_program_enabled) {
    return options.length >= 2;
  }
  const hasAutomatic = hasTransmissionChoice(options, ["avtomat", "automatic", "автомат"]);
  const hasManual = hasTransmissionChoice(options, [
    "mexanika",
    "mehanika",
    "manual",
    "mechanic",
    "механика",
  ]);

  return hasAutomatic && hasManual;
};
/** Balonlar transmission ostida (avlod yo‘q). */
const collectCylinderVolumes = (config = {}, fuelType = null, transmission = null) => {
  if (transmission) {
    return dedupeCylinderVolumesBySignature(
      toVisibleOptions(
        Array.isArray(transmission?.cylinder_volumes) ? transmission.cylinder_volumes : []
      )
    );
  }

  if (fuelType) {
    return dedupeCylinderVolumesBySignature(
      (Array.isArray(fuelType?.transmissions) ? fuelType.transmissions : []).flatMap(
        (transmissionOption) =>
          toVisibleOptions(
            Array.isArray(transmissionOption?.cylinder_volumes)
              ? transmissionOption.cylinder_volumes
              : []
          )
      )
    );
  }

  return dedupeCylinderVolumesBySignature(
    (Array.isArray(config?.fuel_types) ? config.fuel_types : []).flatMap((fuelTypeOption) =>
      (Array.isArray(fuelTypeOption?.transmissions) ? fuelTypeOption.transmissions : []).flatMap(
        (transmissionOption) =>
          toVisibleOptions(
            Array.isArray(transmissionOption?.cylinder_volumes)
              ? transmissionOption.cylinder_volumes
              : []
          )
      )
    )
  );
};

const images = computed(() => normalizeImages(store.product?.images || []));
const optionConfig = computed(() => normalizeProductOptions(store.product?.config_options));
const optionPaths = computed(() => buildOptionPaths(optionConfig.value));
const explicitSelectionPath = computed(() => {
  const deepestGroup = getDeepestSelectedGroup(selectedOptions.value);
  if (!deepestGroup) {
    return null;
  }

  const matchedPath = findPathByOptionId(
    optionPaths.value,
    deepestGroup,
    selectedOptions.value[deepestGroup],
    {
      transmissionId: selectedOptions.value.transmission,
      cylinderVolumeId: selectedOptions.value.cylinder_volume,
    }
  );

  return matchedPath ? prunePathToGroup(matchedPath, deepestGroup) : null;
});
const effectiveSelectionPath = computed(() => {
  const nextPath = explicitSelectionPath.value ? { ...explicitSelectionPath.value } : {};
  const ft = optionConfig.value?.fuel_types?.[0];
  const gearboxOn = Boolean(ft?.gearbox_program_enabled);
  const programEnabled = balloonProgramEnabled.value === true;
  const allTransmissions = dedupeOptionsById(
    (optionConfig.value?.fuel_types || []).flatMap((ft) =>
      toVisibleOptions(ft.transmissions || [])
    )
  );

  let transmission = nextPath.transmission;
  if (!programEnabled) {
    // Transmission (Avtomat/Mexanika) tanlanmaydi.
    transmission = null;
    delete nextPath.transmission;
    delete nextPath.fuel_type;
  } else {
    if (!transmission && allTransmissions.length === 1) {
      transmission = resolveSingleVisibleOption(allTransmissions);
    }
    if (!gearboxOn && !transmission && allTransmissions.length) {
      transmission = allTransmissions[0];
    }
  }

  if (transmission) {
    nextPath.transmission = transmission;
    const matched = findPathByOptionId(
      optionPaths.value,
      "transmission",
      transmission.id
    );
    if (matched?.fuel_type) {
      nextPath.fuel_type = matched.fuel_type;
    }
  }

  const trForVolumes = transmission || allTransmissions[0];
  const mergedCylinderVolumes = dedupeCylinderVolumesBySignature(
    toVisibleOptions(
      Array.isArray(trForVolumes?.cylinder_volumes) ? trForVolumes.cylinder_volumes : []
    )
  );

  const cylinderVolume =
    nextPath.cylinder_volume || resolveSingleVisibleOption(mergedCylinderVolumes);

  if (cylinderVolume) {
    nextPath.cylinder_volume = cylinderVolume;
  }

  if (!Object.keys(nextPath).length) {
    return null;
  }
  return nextPath;
});
const resolvedSelectedOptions = computed(() =>
  effectiveSelectionPath.value
    ? mapPathToSelections(effectiveSelectionPath.value)
    : { ...selectedOptions.value }
);
const optionGroups = computed(() => {
  const groups = [];
  const visibleTransmissions = dedupeOptionsById(
    (optionConfig.value?.fuel_types || []).flatMap((ft) =>
      toVisibleOptions(ft.transmissions || [])
    )
  );

  const firstTransmission = visibleTransmissions[0];
  const visibleCylinderVolumes = firstTransmission
    ? collectCylinderVolumes(optionConfig.value, null, firstTransmission)
    : [];

  if (shouldShowTransmissionOptions(visibleTransmissions)) {
    groups.push({
      key: "transmission",
      titleKey: "productOptions.transmission",
      options: visibleTransmissions.map(mapOptionForDisplay),
    });
  }

  if (visibleCylinderVolumes.length > 1) {
    groups.push({
      key: "cylinder_volume",
      titleKey: "productOptions.cylinderVolume",
      options: visibleCylinderVolumes.map(mapOptionForDisplay),
    });
  }

  return groups;
});

const orderedOptionGroups = computed(() => optionGroups.value);

/** Ko‘rinadigan barcha variant guruhlari tanlangan bo‘lsa true (yoki tanlash shart bo‘lmasa). */
const requiredOptionGroupKeys = computed(() =>
  orderedOptionGroups.value.map((group) => group.key)
);
const selectionHasValue = (bag, key) => {
  const v = bag?.[key];
  return v !== undefined && v !== null && String(v).trim() !== "";
};
const isProductOptionSelectionComplete = computed(() => {
  const resolved = resolvedSelectedOptions.value;
  const raw = selectedOptions.value;
  const hasTransmissionGroup = orderedOptionGroups.value.some(
    (g) => g.key === "transmission"
  );

  // Transmission faqat "Ha" tanlanganda majburiy.
  const keys = requiredOptionGroupKeys.value.filter((key) => {
    if (key !== "transmission") {
      return true;
    }
    return balloonProgramEnabled.value === true;
  });

  if (!keys.length) {
    return true;
  }

  // "Programma kerakmi?" hali javobsiz: balon tanlangan bo‘lsa savatga ruxsat (transmissionsiz).
  if (hasTransmissionGroup && balloonProgramEnabled.value === null) {
    if (!keys.includes("cylinder_volume")) {
      return keys.every((key) => selectionHasValue(resolved, key) || selectionHasValue(raw, key));
    }
    if (!selectionHasValue(resolved, "cylinder_volume") && !selectionHasValue(raw, "cylinder_volume")) {
      return false;
    }
    return keys
      .filter((k) => k !== "transmission")
      .every((key) => selectionHasValue(resolved, key) || selectionHasValue(raw, key));
  }

  return keys.every(
    (key) => selectionHasValue(resolved, key) || selectionHasValue(raw, key)
  );
});
const selectedPrice = computed(() =>
  calculateConfiguredPrice(store.product, locale.value, resolvedSelectedOptions.value, {
    useFallbackPath: false,
    gearboxProgramDeclined: balloonProgramEnabled.value !== true,
  })
);
const creditPlans = computed(() => getCreditPlans(store.product));

/** Kredit mavjud bo‘lsa: 12 oylik reja bo‘lsa default shu, aks holda birinchi reja. */
const setDefaultCreditMonthsForProduct = () => {
  const plans = getCreditPlans(store.product);
  if (!plans.length) {
    selectedCreditMonths.value = null;
    return;
  }
  const defaultPlan = plans.find((plan) => plan.months === 12) ?? plans[0] ?? null;
  selectedCreditMonths.value = defaultPlan?.months ?? null;
};

const selectedCreditConfig = computed(() => {
  const plans = creditPlans.value;
  if (!plans.length) {
    return null;
  }
  const m = Number(selectedCreditMonths.value);
  if (Number.isFinite(m) && m > 0) {
    const match = plans.find((plan) => plan.months === m);
    if (match) {
      return match;
    }
  }
  return plans.find((plan) => plan.months === 12) ?? plans[0] ?? null;
});
const selectedCreditPlan = computed(() => {
  if (!hasCreditPricing(store.product) || !selectedCreditConfig.value) {
    return null;
  }

  return calculateCreditPlan(
    selectedPrice.value,
    selectedCreditConfig.value.percent,
    selectedCreditConfig.value.months
  );
});
const configuredBasketItem = computed(() =>
  store.product
    ? buildConfiguredBasketItem(store.product, resolvedSelectedOptions.value, 1, {
        useFallbackPath: false,
        gearboxProgramDeclined: balloonProgramEnabled.value !== true,
      })
    : null
);
const currentOrderTotal = computed(() => {
  const numericPrice = parseNumericPrice(selectedPrice.value);
  return numericPrice === null ? 0 : numericPrice;
});
const currentOrderTotalLabel = computed(() => {
  if (currentOrderTotal.value > 0) {
    return formatPrice(currentOrderTotal.value);
  }

  if (typeof selectedPrice.value === "string" && selectedPrice.value.trim()) {
    return selectedPrice.value;
  }

  return formatPrice(selectedPrice.value);
});
const canUseCreditOrder = computed(
  () => hasCreditPricing(store.product) && Boolean(selectedCreditConfig.value)
);
const selectedOptionsSummary = computed(
  () => configuredBasketItem.value?.selected_options || []
);
const orderProductsPayload = computed(() => {
  const item = configuredBasketItem.value;
  if (!item) {
    return [];
  }

  return [
    {
      id: item.id,
      name: item[`name_${locale.value}`] || item.name_uz || "",
      quantity: item.quantity,
      price: item[`selected_price_${locale.value}`] ?? item[`price_${locale.value}`] ?? "",
      selected_options: item.selected_options || [],
      credit_plan: selectedCreditConfig.value
        ? {
            months: selectedCreditConfig.value.months,
            percent: selectedCreditConfig.value.percent,
          }
        : null,
    },
  ];
});
const relatedProducts = computed(() => {
  const list = Array.isArray(store.products) ? store.products : [];
  return list.filter((p) => p.id !== store.product?.id).slice(0, 4);
});

const goToSlide = (index) => {
  if (swiperInstance) {
    swiperInstance.slideTo(index);
  }
};
const observeStickyPrice = () => {
  if (priceSummaryObserver) {
    priceSummaryObserver.disconnect();
    priceSummaryObserver = null;
  }

  if (
    typeof window === "undefined" ||
    typeof IntersectionObserver === "undefined" ||
    !summaryRef.value
  ) {
    stickyPriceVisible.value = false;
    return;
  }

  priceSummaryObserver = new IntersectionObserver(
    ([entry]) => {
      stickyPriceVisible.value = !entry.isIntersecting;
    },
    {
      root: null,
      threshold: 0.18,
      rootMargin: "-92px 0px 0px 0px",
    }
  );

  priceSummaryObserver.observe(summaryRef.value);
};
const buildNextSelections = (currentSelections, groupKey, optionId) => {
  const flow = getOptionFlow();
  const groupIndex = flow.indexOf(groupKey);
  if (groupIndex === -1) {
    return {
      ...(currentSelections || {}),
      [groupKey]: optionId,
    };
  }

  if (!optionId || currentSelections?.[groupKey] === optionId) {
    return flow.reduce((nextSelections, key, index) => {
      if (index < groupIndex && currentSelections?.[key]) {
        nextSelections[key] = currentSelections[key];
      }

      return nextSelections;
    }, {});
  }

  const pathContext = {
    transmissionId: currentSelections?.transmission,
    cylinderVolumeId: currentSelections?.cylinder_volume,
  };
  const matchedPath = findPathByOptionId(
    optionPaths.value,
    groupKey,
    optionId,
    pathContext
  );

  // Flow tartibi UI tartibidan farq qilishi mumkin (avtomat/mexanika avval, balon keyin).
  // Oldin `index < groupIndex` faqat "oldingi" kalitlarni saqlardi — transmission yo‘qolib qolardi.
  const nextSelections = { [groupKey]: optionId };
  for (const key of flow) {
    if (key === groupKey) continue;
    const cur = currentSelections?.[key];
    if (!cur) continue;
    const pathOpt = matchedPath?.[key];
    if (pathOpt && String(pathOpt.id) === String(cur)) {
      nextSelections[key] = cur;
    }
  }
  return nextSelections;
};

const resetOrderForm = (orderType = canUseCreditOrder.value ? "credit" : "standard") => {
  orderForm.value = {
    ...createEmptyOrderForm(orderType),
    ...getCustomerOrderFields(),
    amount: currentOrderTotal.value > 0 ? String(currentOrderTotal.value) : "",
    period: selectedCreditConfig.value?.months
      ? String(selectedCreditConfig.value.months)
      : "",
    startDate: getTodayIsoDate(),
  };
};

const openOrderModal = () => {
  if (!store.product) return;
  if (!isProductOptionSelectionComplete.value) {
    notification.value = {
      show: true,
      message: t("productOptions.selectAllRequired"),
    };
    return;
  }
  customerProfile.value = getStoredCustomerSession();
  resetOrderForm(canUseCreditOrder.value ? "credit" : "standard");
  orderError.value = "";
  orderModalOpen.value = true;
};

const closeOrderModal = () => {
  if (orderSubmitting.value) return;
  orderModalOpen.value = false;
  orderError.value = "";
};
const openFuelGuideModal = () => {
  fuelGuideModalOpen.value = true;
};
const closeFuelGuideModal = () => {
  fuelGuideModalOpen.value = false;
};

const handleAddToBasket = () => {
  if (detailAnimating.value || !configuredBasketItem.value) return;
  if (!isProductOptionSelectionComplete.value) {
    notification.value = {
      show: true,
      message: t("productOptions.selectAllRequired"),
    };
    return;
  }

  basketStore.addToBasket(configuredBasketItem.value);
  notification.value = {
    show: true,
    message: `${store.product[`name_${locale.value}`]} ${t("add_to_cart2")}`,
  };
  detailAnimating.value = true;
  setTimeout(() => (detailShowCheck.value = true), 400);
  setTimeout(() => {
    detailShowCheck.value = false;
    detailAnimating.value = false;
  }, 1600);
};

const buildCreditPhoneList = () =>
  [...new Set(
    orderForm.value.phones
      .split(",")
      .map((phone) => normalizeCustomerPhone(phone))
      .filter((phone) => phone.length === 12)
  )];

const buildCreditCustomerName = () =>
  [
    orderForm.value.lastName,
    orderForm.value.firstName,
    orderForm.value.middleName,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");

const submitProductOrder = async () => {
  if (!isProductOptionSelectionComplete.value) {
    orderError.value = t("productOptions.selectAllRequired");
    return;
  }
  if (!orderProductsPayload.value.length) {
    orderError.value = t("please_fill_all_fields");
    return;
  }

  const resolvedOrderType =
    orderForm.value.orderType === "credit" && canUseCreditOrder.value
      ? "credit"
      : "standard";

  let payload = {
    name: "",
    phone: "",
    locale: locale.value,
    total: currentOrderTotal.value,
    products: orderProductsPayload.value,
    order_type: resolvedOrderType,
  };

  if (resolvedOrderType === "standard") {
    const name = orderForm.value.name.trim();
    const phone = normalizeCustomerPhone(orderForm.value.phone);

    if (!name || !phone || phone.length !== 12) {
      orderError.value = t("please_fill_all_fields");
      return;
    }

    payload = {
      ...payload,
      name,
      phone,
    };
  } else {
    const creditName = buildCreditCustomerName();
    const phones = buildCreditPhoneList();
    const requiredFields = [
      orderForm.value.tariffId,
      orderForm.value.amount,
      orderForm.value.period,
      orderForm.value.startDate,
      orderForm.value.passport,
      orderForm.value.pinfl,
      orderForm.value.lastName,
      orderForm.value.firstName,
      orderForm.value.middleName,
      orderForm.value.gender,
      orderForm.value.birthDate,
      orderForm.value.regionId,
      orderForm.value.districtId,
    ];

    if (
      requiredFields.some((value) => !String(value || "").trim()) ||
      !creditName ||
      !phones.length
    ) {
      orderError.value = t("orderModal.requiredCredit");
      return;
    }

    payload = {
      ...payload,
      name: creditName,
      phone: phones[0],
      total: Number(orderForm.value.amount) || currentOrderTotal.value,
      credit: {
        tariff_id: Number(orderForm.value.tariffId),
        amount: Number(orderForm.value.amount),
        initial_payment: Number(orderForm.value.initialPayment) || 0,
        period: Number(orderForm.value.period),
        start_date: orderForm.value.startDate,
        passport: orderForm.value.passport.trim(),
        pinfl: orderForm.value.pinfl.trim(),
        last_name: orderForm.value.lastName.trim(),
        first_name: orderForm.value.firstName.trim(),
        middle_name: orderForm.value.middleName.trim(),
        gender: orderForm.value.gender.trim(),
        birth_date: orderForm.value.birthDate,
        region_id: Number(orderForm.value.regionId),
        district_id: Number(orderForm.value.districtId),
        phones,
      },
    };
  }

  orderSubmitting.value = true;
  orderError.value = "";

  try {
    const response = await apiClient.post("/products/order", payload);
    const creditNumber = response.data?.credit?.number;

    notification.value = {
      show: true,
      message:
        resolvedOrderType === "credit"
          ? creditNumber
            ? `${t("orderModal.creditSuccess")} #${creditNumber}`
            : t("orderModal.creditSuccess")
          : t("success"),
    };
    orderModalOpen.value = false;
    resetOrderForm(resolvedOrderType);
  } catch (error) {
    orderError.value = getApiErrorMessage(error, t("send"));
  } finally {
    orderSubmitting.value = false;
  }
};

const fetchProductData = async (id) => {
  const productId = Number(id);
  if (!Number.isFinite(productId) || productId <= 0) {
    store.product = null;
    router.replace({ name: "NotFound" });
    return;
  }

  const productExists = await store.fetchProductDetail(productId);
  if (!productExists) {
    router.replace({ name: "NotFound" });
    return;
  }

  if (!store.products.length) {
    await store.fetchProducts(200, 0);
  }

  selectedOptions.value = {};
  balloonProgramEnabled.value = resolveDefaultBalloonProgramEnabled();
  setDefaultCreditMonthsForProduct();
  activeTab.value = "description";
  fuelGuideModalOpen.value = false;
  closeOrderModal();
  stickyPriceVisible.value = false;

  await nextTick();
  observeStickyPrice();
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-show");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  relatedProductRefs.value.forEach((el) => {
    if (el) observer.observe(el);
  });
};

const setBalloonProgramEnabled = (enabled) => {
  balloonProgramEnabled.value = enabled === true ? true : false;

  // Transmission tanlovi o'chirilsa, narx transmissionPrice qo'shilmasdan faqat balon hajmi narxidan hisoblanadi.
  const next = { ...(selectedOptions.value || {}) };
  delete next.transmission;

  // Cylinder volume ro‘yxati (dedupe) qo‘shimcha "gearbox" yoqilganda qayta hisoblansa,
  // backend bir xil "razmer"ni turli `id` bilan yuborgan bo‘lishi mumkin.
  // Bunday holatda oldin tanlangan `id` endi ro‘yxatda bo‘lmay qoladi va UI "bo‘sh" ko‘rinadi.
  // Tanlangan cylinder volume ni label+count+price_delta bo‘yicha mos `id` ga remap qilamiz.
  if (next.cylinder_volume) {
    const signatureFromOption = (opt) => {
      const label = String(opt?.label || "").trim();
      const count = Number(opt?.count ?? 0);
      const priceDelta = Number(opt?.price_delta ?? 0);
      return `${label}|${count}|${priceDelta}`;
    };

    const selectedId = next.cylinder_volume;

    const cfg = optionConfig.value;
    const fuelTypes = Array.isArray(cfg?.fuel_types) ? cfg.fuel_types : [];

    let selectedOpt = null;
    for (const ft of fuelTypes) {
      const transmissions = Array.isArray(ft?.transmissions) ? ft.transmissions : [];
      for (const tr of transmissions) {
        const vols = toVisibleOptions(Array.isArray(tr?.cylinder_volumes) ? tr.cylinder_volumes : []);
        const found = vols.find((v) => String(v?.id || "").trim() === String(selectedId || "").trim());
        if (found) {
          selectedOpt = found;
          break;
        }
      }
      if (selectedOpt) break;
    }

    if (selectedOpt) {
      const selectedSignature = signatureFromOption(selectedOpt);

      const visibleTransmissions = dedupeOptionsById(
        (optionConfig.value?.fuel_types || []).flatMap((ft) => toVisibleOptions(ft.transmissions || []))
      );
      const firstTransmission = visibleTransmissions[0];
      if (firstTransmission) {
        const currentCylinderOptions = collectCylinderVolumes(optionConfig.value, null, firstTransmission);
        const matched = currentCylinderOptions.find(
          (o) => signatureFromOption(o) === selectedSignature
        );
        if (matched && String(matched.id) !== String(selectedId)) {
          next.cylinder_volume = matched.id;
        }
      }
    }
  }

  selectedOptions.value = next;
};

const selectOption = (groupKey, optionId) => {
  selectedOptions.value = buildNextSelections(
    selectedOptions.value,
    groupKey,
    optionId
  );
};

const goToDetail = (id) => {
  useLoaderStore().loader = true;
  router.push({ name: "ProductDetail", params: { id } });
};

const handleClick = (product) => {
  const id = product.id;
  if (animating.value[id]) return;
  animating.value = { ...animating.value, [id]: true };
  setTimeout(() => (showCheck.value = { ...showCheck.value, [id]: true }), 400);
  setTimeout(() => {
    showCheck.value = { ...showCheck.value, [id]: false };
    animating.value = { ...animating.value, [id]: false };
  }, 1600);
  basketStore.addToBasket(
    buildConfiguredBasketItem(product, {}, 1, { useFallbackPath: false })
  );
};

const handleEscape = (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (fuelGuideModalOpen.value) {
    closeFuelGuideModal();
    return;
  }

  if (orderModalOpen.value) {
    closeOrderModal();
  }
};

const relatedActionLabel = () => t("add_to_cart");

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      await fetchProductData(Number(newId));
    }
  }
);

watch(
  creditPlans,
  (plans) => {
    const currentMonths = Number(selectedCreditMonths.value);
    if (!plans.some((plan) => plan.months === currentMonths)) {
      const defaultPlan =
        plans.find((plan) => plan.months === 12) ?? plans[0] ?? null;
      selectedCreditMonths.value = defaultPlan?.months ?? null;
    }
  },
  { immediate: true }
);

watch(isAnyModalOpen, (isOpen) => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = isOpen ? "hidden" : "";
  }
});

watch(
  () => orderForm.value.orderType,
  (nextType) => {
    if (nextType === "credit") {
      if (!orderForm.value.amount && currentOrderTotal.value > 0) {
        orderForm.value.amount = String(currentOrderTotal.value);
      }
      if (!orderForm.value.period && selectedCreditConfig.value?.months) {
        orderForm.value.period = String(selectedCreditConfig.value.months);
      }
      if (!orderForm.value.startDate) {
        orderForm.value.startDate = getTodayIsoDate();
      }
    } else if (customerProfile.value) {
      applyCustomerProfileToOrderForm();
    }

    orderError.value = "";
  }
);

onMounted(async () => {
  await fetchProductData(Number(route.params.id));
});

onMounted(() => {
  if (swiperRef.value && swiperRef.value.swiper) {
    swiperInstance = swiperRef.value.swiper;
  }
  window.addEventListener("keydown", handleEscape);
});

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
  if (priceSummaryObserver) {
    priceSummaryObserver.disconnect();
    priceSummaryObserver = null;
  }
  window.removeEventListener("keydown", handleEscape);
});
</script>

<template>
  <div
    v-if="store.product"
    class="detail-page container mx-auto mt-[100px] px-6"
  >
    <div
      class="detail-topbar mb-[20px] flex justify-center items-center relative animate-fade-in-down"
    >
      <button
        type="button"
        @click="$router.back()"
        class="detail-back cursor-pointer"
        :aria-label="t('nav.back')"
      >
        <LeftArrow :size="40" />
      </button>

      <h2 class="detail-page-title text-center text-2xl font-bold sm:text-3xl">
        {{ t("product.about") }}
      </h2>
    </div>

    <transition name="detail-price-sticky-fade">
      <div
        v-if="stickyPriceVisible"
        class="detail-price-sticky"
      >
        <span class="detail-price-sticky-label">
          {{ t("productOptions.totalPrice") }}
        </span>
        <strong class="detail-price-sticky-value">
          {{ formatPrice(selectedPrice) }}
        </strong>
      </div>
    </transition>

    <div class="detail-main flex flex-col lg:flex-row gap-12 pb-[20px] animate-slide-in-up">
      <div class="detail-gallery lg:w-1/2 flex justify-center items-center flex-col gap-4">
        <div class="detail-gallery-stage">
          <Swiper
            ref="swiperRef"
            class="detail-swiper h-[450px] w-full rounded-2xl bg-white"
            space-between="10"
            slides-per-view="1"
            :onSwiper="(swiper) => (swiperInstance = swiper)"
          >
            <SwiperSlide v-for="(img, index) in images" :key="index">
              <img
                :src="img"
                alt="Product"
                class="detail-slide-image h-[450px] w-full rounded-2xl object-contain transition-transform duration-500"
              />
            </SwiperSlide>
          </Swiper>
        </div>
        <div class="detail-thumbs flex gap-2 overflow-x-auto mt-2">
          <img
            v-for="(img, index) in images"
            :key="index"
            :src="img"
            class="detail-thumb h-24 w-24 cursor-pointer rounded-xl border object-cover transition-all duration-300"
            @click="goToSlide(index)"
          />
        </div>
      </div>

      <div class="detail-info lg:w-1/2 flex flex-col gap-[20px] justify-center">
        <div ref="summaryRef" class="detail-summary detail-section">
          <div class="detail-summary-head">
            <span class="detail-product-id">ID {{ store.product?.id }}</span>
          </div>
          <h1
            class="detail-name text-4xl font-bold text-gray-900 tracking-tight leading-snug"
          >
            {{ store.product[`name_${locale}`] }}
          </h1>

          <div class="detail-price-box">
            <span
              v-if="optionGroups.length"
              class="detail-price-label text-sm font-semibold uppercase tracking-[0.16em] text-slate-500"
            >
              {{ t("productOptions.totalPrice") }}
            </span>
            <span class="detail-price text-3xl font-semibold">
              {{ formatPrice(selectedPrice) }}
            </span>

            <div
              v-if="selectedCreditPlan && selectedCreditConfig"
              class="detail-credit-inline"
            >
              <div
                v-if="creditPlans.length"
                class="detail-credit-inline-block"
              >
                <div class="credit-plan-switcher detail-credit-plan-switcher">
                  <button
                    v-for="plan in creditPlans"
                    :key="`${plan.months}-${plan.percent}`"
                    type="button"
                    class="credit-plan-btn"
                    :class="
                      selectedCreditConfig?.months === plan.months
                        ? 'credit-plan-btn-active'
                        : ''
                    "
                    @click="selectedCreditMonths = plan.months"
                  >
                    <span>
                      {{ plan.months }} {{ t("credit.months") }}
                    </span>
                  </button>
                </div>
              </div>

              <div class="detail-credit-payment">
                <strong class="detail-credit-inline-value">
                  <span>{{ selectedCreditConfig.months }} {{ t("credit.months") }}</span>
                  <span
                    class="detail-credit-inline-separator"
                    aria-hidden="true"
                  >
                    •
                  </span>
                  <span>{{ formatPrice(selectedCreditPlan.monthlyPayment) }}</span>
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-actions">
          <div
            v-if="optionGroups.length"
            class="detail-options detail-section"
          >
            <div class="detail-options-head">
              <p class="detail-options-kicker">
                {{ t("productOptions.selectionHelp") }}
              </p>
            </div>
            <template
              v-for="group in orderedOptionGroups"
              :key="group.key"
            >
              <div
                v-if="group.key !== 'transmission' || balloonProgramEnabled !== false"
                class="detail-option-group"
              >
              <div class="detail-option-headline">
                <div class="detail-option-heading">
                  <h3 class="text-sm font-semibold text-slate-700">
                    {{
                      group.key === "transmission"
                        ? balloonProgramEnabled === true
                          ? t("productOptions.transmission")
                          : t("productOptions.balloonProgramQuestion")
                        : t(group.titleKey)
                    }}
                  </h3>
                  <button
                    v-if="group.key === 'transmission' && balloonProgramEnabled === true"
                    type="button"
                    class="detail-info-trigger"
                    :aria-label="t('productOptions.fuelGuide.open')"
                    @click="openFuelGuideModal"
                  >
                    <CircleHelp class="h-4 w-4" />
                  </button>
                </div>
              </div>
            <div
              v-if="group.key === 'transmission' && balloonProgramEnabled !== true"
              class="balloon-program-toggle"
              role="radiogroup"
              :aria-label="t('productOptions.balloonProgramQuestion')"
            >
              <label
                class="balloon-program-toggle-btn"
                :class="{
                  'balloon-program-toggle-btn-active':
                    balloonProgramEnabled === true,
                }"
              >
                <input
                  type="radio"
                  class="balloon-program-toggle-input"
                  name="balloon-program-needed"
                  :checked="balloonProgramEnabled === true"
                  @change="setBalloonProgramEnabled(true)"
                />
                <span>{{ t("productOptions.balloonProgramYes") }}</span>
              </label>
              <label
                class="balloon-program-toggle-btn"
                :class="{
                  'balloon-program-toggle-btn-active':
                    balloonProgramEnabled === false,
                }"
              >
                <input
                  type="radio"
                  class="balloon-program-toggle-input"
                  name="balloon-program-needed"
                  :checked="balloonProgramEnabled === false"
                  @change="setBalloonProgramEnabled(false)"
                />
                <span>{{ t("productOptions.balloonProgramNo") }}</span>
              </label>
            </div>
              <div
                v-if="
                  group.key === 'cylinder_volume' &&
                  group.options.length > 1
                "
                class="detail-select-shell"
              >
                <div
                  class="detail-select-wrap"
                  :class="{
                    'detail-select-wrap-active': selectedOptions[group.key],
                  }"
                >
                  <select
                    :value="selectedOptions[group.key] || ''"
                    class="detail-select-input"
                    @change="selectOption(group.key, $event.target.value)"
                  >
                    <option value="">
                      {{ getOptionSelectPlaceholder(group.key) }}
                    </option>
                    <option
                      v-for="option in group.options"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ formatSelectOptionLabel(group.key, option) }}
                    </option>
                  </select>
                  <span class="detail-select-icon" aria-hidden="true">⌄</span>
                </div>
              </div>
              <div
                v-else-if="group.key === 'cylinder_volume'"
                class="detail-select-shell"
              >
                <div class="detail-select-wrap detail-select-wrap-active">
                  <div class="detail-static-value">
                    {{ formatSelectOptionLabel(group.key, group.options[0]) }}
                  </div>
                </div>
              </div>
              <div
                v-else-if="group.key !== 'transmission' || balloonProgramEnabled === true"
                :class="[
                  'detail-option-grid flex flex-wrap gap-2',
                  {
                    'detail-option-grid-transmission': group.key === 'transmission',
                  },
                ]"
              >
                <button
                  v-for="option in group.options"
                  :key="option.id"
                  type="button"
                  @click="selectOption(group.key, option.id)"
                  class="detail-option"
                  :class="
                    selectedOptions[group.key] === option.id
                      ? 'detail-option-active'
                      : ''
                  "
                >
                  <span>
                    {{
                      group.key === "cylinder_volume"
                        ? formatCylinderOptionLabel(option)
                        : option.label
                    }}
                  </span>
                  <span
                    v-if="group.key === 'cylinder_volume' && formatCylinderOptionMeta(option)"
                    class="detail-option-meta"
                  >
                    {{ formatCylinderOptionMeta(option) }}
                  </span>
                </button>
              </div>
            </div>
            </template>
          </div>

          <div class="detail-order-tools detail-section">
            <div class="detail-order-head">
              <p class="detail-options-kicker">{{ t("order_now") }}</p>
              <strong class="detail-order-total">{{ currentOrderTotalLabel }}</strong>
            </div>

            <p
              v-if="orderedOptionGroups.length && !isProductOptionSelectionComplete"
              class="detail-options-required-hint"
            >
              {{ t("productOptions.selectAllRequired") }}
            </p>

            <div class="detail-primary-actions">
              <button
                @click="handleAddToBasket"
                :disabled="!isProductOptionSelectionComplete"
                class="detail-add-btn relative flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 font-medium text-white transition-all duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100"
              >
                <span
                  :class="
                    detailAnimating ? 'opacity-0 scale-90' : 'opacity-100 scale-100'
                  "
                  class="transition-all duration-300"
                >
                  {{ $t("add_to_cart") }}
                </span>
                <ShoppingCart
                  :class="
                    detailAnimating
                      ? 'translate-x-44 opacity-0'
                      : 'translate-x-0 opacity-100'
                  "
                  class="absolute w-5 h-5 left-5 transition-all duration-500"
                />
                <Check
                  :class="
                    detailShowCheck ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  "
                  class="absolute w-6 h-6 text-white transition-all duration-500"
                />
              </button>

              <button
                type="button"
                class="detail-order-btn"
                :disabled="!isProductOptionSelectionComplete"
                @click="openOrderModal"
              >
                {{ t("order_now") }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="detail-copy-section animate-fade-in-up">
      <div class="detail-tabs flex gap-4 mt-4 mb-2">
        <span
          @click="activeTab = 'description'"
          :class="
              activeTab === 'description'
              ? 'detail-tab detail-tab-active'
              : 'detail-tab'
          "
          class="pb-1 font-semibold transition-all"
        >
          {{ $t("description") }}
        </span>
        <span
          @click="activeTab = 'characteristic'"
          :class="
              activeTab === 'characteristic'
              ? 'detail-tab detail-tab-active'
              : 'detail-tab'
          "
          class="pb-1 font-semibold transition-all"
          >{{ $t("characteristic") }}
        </span>
      </div>
      <div class="detail-copy-body">
        <span
          v-if="activeTab !== 'characteristic'"
          v-html="store.product[`description_${locale}`]"
          class="detail-content animate-fade-in"
        ></span>
        <span
          v-if="activeTab === 'characteristic'"
          v-html="
            store.product[`characteristic_${locale}`]?.replace(/\r?\n/g, '<br>')
          "
          class="detail-content animate-fade-in"
        ></span>
      </div>
    </section>

    <section
      v-if="relatedProducts.length"
      class="related-section animate-fade-in-up"
    >
      <div class="related-section-head">
        <h3 class="related-heading text-3xl font-bold">
          {{ t("related_products") }}
        </h3>
      </div>
      <div
        class="related-grid grid grid-cols-1 mb-[30px] sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8"
      >
        <div
          v-for="(product, index) in relatedProducts"
          :key="product.id"
          :ref="(el) => (relatedProductRefs[index] = el)"
          :style="{ 'transition-delay': `${index * 100}ms` }"
          class="related-card group"
        >
          <div
            @click="goToDetail(product.id)"
            class="related-media cursor-pointer"
          >
            <span class="related-chip">#{{ product.id }}</span>
            <img
              :src="normalizeImages(product.images)[0]"
              alt="Image"
              class="related-image"
            />
          </div>
          <h3
            @click="goToDetail(product.id)"
            class="related-title"
          >
            {{ product[`name_${locale}`] }}
          </h3>
          <p class="related-price">
            {{ formatPrice(getProductDisplayPrice(product)) }}
          </p>

          <div class="flex gap-2">
            <button
              @click="handleClick(product)"
              class="relative flex-1 cursor-pointer flex items-center justify-center gap-2 buttonShop related-btn text-white py-2.5 rounded-xl font-medium overflow-hidden"
            >
              <span
                class="transition-all duration-300"
                :class="
                  animating[product.id]
                    ? 'opacity-0 scale-0'
                    : 'opacity-100 scale-100'
                "
              >
                {{ relatedActionLabel(product) }}
              </span>
              <ShoppingCart
                class="related-cart-icon absolute w-5 h-5 transition-all duration-500"
                :class="
                  animating[product.id]
                    ? 'translate-x-44 opacity-0'
                    : 'translate-x-0 opacity-100'
                "
              />
              <Check
                class="absolute w-6 h-6 text-white transition-all duration-500"
                :class="
                  showCheck[product.id]
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-0'
                "
              />
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
  <teleport to="body">
    <div
      v-if="orderModalOpen"
      class="order-modal-overlay"
      @click.self="closeOrderModal"
    >
      <div class="order-modal-panel">
        <div class="order-modal-head">
          <div>
            <p class="order-modal-kicker">{{ t("orderModal.title") }}</p>
            <h3 class="order-modal-title">
              {{ store.product?.[`name_${locale}`] }}
            </h3>
          </div>

          <button
            type="button"
            class="order-modal-close"
            :disabled="orderSubmitting"
            @click="closeOrderModal"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="order-modal-summary">
          <div>
            <span class="order-modal-summary-label">{{ t("orderModal.productSummary") }}</span>
            <strong class="order-modal-summary-value">{{ currentOrderTotalLabel }}</strong>
          </div>
        </div>

        <div
          v-if="selectedOptionsSummary.length"
          class="order-option-summary"
        >
          <span
            v-for="option in selectedOptionsSummary"
            :key="option.group_key"
            class="order-option-chip"
          >
            {{ t(option.title_key) }}: {{ formatSelectedOptionLabel(option) }}
          </span>
        </div>

        <div class="order-type-switcher">
          <button
            type="button"
            class="order-type-btn"
            :class="{ 'order-type-btn-active': orderForm.orderType === 'standard' }"
            @click="orderForm.orderType = 'standard'"
          >
            {{ t("orderModal.standard") }}
          </button>
          <button
            v-if="canUseCreditOrder"
            type="button"
            class="order-type-btn"
            :class="{ 'order-type-btn-active': orderForm.orderType === 'credit' }"
            @click="orderForm.orderType = 'credit'"
          >
            {{ t("orderModal.credit") }}
          </button>
        </div>

        <div
          v-if="orderForm.orderType === 'credit' && canUseCreditOrder"
          class="order-modal-form-grid"
        >
          <label class="order-field">
            <span>{{ t("orderModal.tariffId") }}</span>
            <input
              v-model="orderForm.tariffId"
              type="number"
              inputmode="numeric"
              :placeholder="t('orderModal.tariffHelp')"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.amount") }}</span>
            <input
              v-model="orderForm.amount"
              type="number"
              inputmode="numeric"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.initialPayment") }}</span>
            <input
              v-model="orderForm.initialPayment"
              type="number"
              inputmode="numeric"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.period") }}</span>
            <input
              v-model="orderForm.period"
              type="number"
              inputmode="numeric"
              :placeholder="t('orderModal.periodHelp')"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.startDate") }}</span>
            <input
              v-model="orderForm.startDate"
              type="date"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.passport") }}</span>
            <input
              v-model="orderForm.passport"
              type="text"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.pinfl") }}</span>
            <input
              v-model="orderForm.pinfl"
              type="text"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.lastName") }}</span>
            <input
              v-model="orderForm.lastName"
              type="text"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.firstName") }}</span>
            <input
              v-model="orderForm.firstName"
              type="text"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.middleName") }}</span>
            <input
              v-model="orderForm.middleName"
              type="text"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.gender") }}</span>
            <input
              v-model="orderForm.gender"
              type="text"
              :placeholder="t('orderModal.genderPlaceholder')"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.birthDate") }}</span>
            <input
              v-model="orderForm.birthDate"
              type="date"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.regionId") }}</span>
            <input
              v-model="orderForm.regionId"
              type="number"
              inputmode="numeric"
              :placeholder="t('orderModal.regionHelp')"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("orderModal.districtId") }}</span>
            <input
              v-model="orderForm.districtId"
              type="number"
              inputmode="numeric"
              :placeholder="t('orderModal.districtHelp')"
              class="order-input"
            />
          </label>

          <label class="order-field order-field-full">
            <span>{{ t("orderModal.phones") }}</span>
            <input
              v-model="orderForm.phones"
              type="text"
              :placeholder="t('orderModal.phonesHint')"
              class="order-input"
            />
          </label>
        </div>

        <div v-else class="order-modal-form-grid">
          <label class="order-field">
            <span>{{ t("name") }}</span>
            <input
              v-model="orderForm.name"
              type="text"
              class="order-input"
            />
          </label>

          <label class="order-field">
            <span>{{ t("phone") }}</span>
            <input
              v-model="orderForm.phone"
              type="tel"
              placeholder="+998"
              class="order-input"
            />
          </label>
        </div>

        <p v-if="orderError" class="order-error">{{ orderError }}</p>

        <button
          type="button"
          class="order-submit-btn"
          :disabled="orderSubmitting"
          @click="submitProductOrder"
        >
          {{
            orderSubmitting
              ? t("sending")
              : orderForm.orderType === "credit" && canUseCreditOrder
                ? t("orderModal.submitCredit")
                : t("orderModal.submitStandard")
          }}
        </button>
      </div>
    </div>
  </teleport>
  <teleport to="body">
    <div
      v-if="fuelGuideModalOpen"
      class="fuel-guide-overlay"
      @click.self="closeFuelGuideModal"
    >
      <div class="fuel-guide-panel">
        <div class="fuel-guide-head">
          <div>
            <p class="order-modal-kicker">{{ t("productOptions.fuelGuide.open") }}</p>
            <h3 class="fuel-guide-title">
              {{ t("productOptions.fuelGuide.title") }}
            </h3>
            <p class="fuel-guide-intro">
              {{ t("productOptions.fuelGuide.intro") }}
            </p>
          </div>

          <button
            type="button"
            class="order-modal-close"
            @click="closeFuelGuideModal"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <div class="fuel-guide-grid">
          <article
            v-for="section in fuelGuideSections"
            :key="section.title"
            class="fuel-guide-card"
          >
            <h4 class="fuel-guide-card-title">{{ section.title }}</h4>
            <div class="fuel-guide-columns">
              <section class="fuel-guide-column">
                <h5 class="fuel-guide-column-title">
                  {{ section.automaticTitle }}
                </h5>
                <ul class="fuel-guide-list">
                  <li
                    v-for="item in section.automaticItems"
                    :key="item"
                  >
                    {{ item }}
                  </li>
                </ul>
              </section>
              <section class="fuel-guide-column">
                <h5 class="fuel-guide-column-title">
                  {{ section.manualTitle }}
                </h5>
                <ul class="fuel-guide-list">
                  <li
                    v-for="item in section.manualItems"
                    :key="item"
                  >
                    {{ item }}
                  </li>
                </ul>
              </section>
            </div>
          </article>
        </div>

        <p class="fuel-guide-note">
          {{ t("productOptions.fuelGuide.note") }}
        </p>
      </div>
    </div>
  </teleport>
  <Notification
    v-if="notification.show"
    :message="notification.message"
    :show="notification.show"
    @close="notification.show = false"
    class="z-[999999999999999]"
  />
</template>

<style scoped>
.detail-page {
  --detail-border: rgba(20, 35, 56, 0.1);
  --detail-border-strong: rgba(20, 35, 56, 0.18);
  --detail-surface: #ffffff;
  --detail-surface-muted: #f5f6f7;
  --detail-surface-quiet: #fafaf8;
  --detail-ink: #142338;
  --detail-subtle: #64748b;
  --detail-accent: #18304f;
  --detail-accent-soft: #eef2f5;
  --detail-credit: #eef8f1;
  background: transparent;
  padding-bottom: 3rem;
  color: var(--detail-ink);
}

.detail-topbar {
  min-height: 48px;
  padding-inline: 3.8rem;
}

.detail-page-title {
  color: var(--detail-ink);
  letter-spacing: -0.02em;
}

.detail-back {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 1px solid var(--detail-border);
  border-radius: 16px;
  background: var(--detail-surface);
  color: var(--detail-accent);
  padding: 0;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.detail-back:hover {
  background: var(--detail-surface-muted);
  border-color: var(--detail-border-strong);
}

.detail-main {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: clamp(1rem, 3vw, 2rem);
  padding: 0;
  border: none;
  background: transparent;
  backdrop-filter: none;
}

.detail-gallery {
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
  align-items: stretch;
  gap: 1rem;
}

.detail-gallery-stage {
  width: 100%;
  padding: 0;
  border-radius: 30px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-muted);
}

.detail-swiper {
  border: none;
  background: transparent;
}

.detail-slide-image {
  border: 1px solid rgba(20, 35, 56, 0.06);
  background: var(--detail-surface);
}

.detail-thumbs {
  width: 100%;
  padding-bottom: 0.1rem;
}

.detail-thumb {
  border-color: var(--detail-border);
  background: var(--detail-surface);
  flex-shrink: 0;
  opacity: 0.82;
}

.detail-thumb:hover {
  border-color: var(--detail-border-strong);
  opacity: 1;
}

.detail-info {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
  gap: 1rem;
  color: var(--detail-ink);
}

.detail-section {
  display: grid;
  gap: 1rem;
  border: 1px solid var(--detail-border);
  border-radius: 28px;
  background: var(--detail-surface);
  padding: clamp(1rem, 2vw, 1.2rem);
}

.detail-summary {
  background: var(--detail-surface-quiet);
}

.detail-summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.detail-product-id {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border-radius: 999px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface);
  color: var(--detail-subtle);
  padding: 0.42rem 0.8rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.detail-name {
  color: var(--detail-ink);
  font-size: clamp(1.7rem, 2.8vw, 2.4rem);
  margin: 0;
}

.detail-price-box {
  display: grid;
  gap: 0.45rem;
  width: 100%;
  padding-top: 1rem;
  border-top: 1px solid var(--detail-border);
}

.detail-price {
  color: var(--detail-ink);
  font-size: clamp(2rem, 4vw, 2.35rem);
  line-height: 1.05;
}

.detail-price-label {
  color: var(--detail-subtle);
}

.detail-credit-inline {
  display: grid;
  gap: 0.85rem;
  margin-top: 0.2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--detail-border);
}

.detail-credit-inline-block {
  display: grid;
  gap: 0.7rem;
  min-width: 0;
}

.detail-credit-inline-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #688171;
}

.detail-credit-plan-switcher {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.45rem;
  overflow-x: auto;
  padding-bottom: 0.1rem;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.detail-credit-plan-switcher::-webkit-scrollbar {
  display: none;
}

.detail-credit-plan-switcher .credit-plan-btn {
  flex: 0 0 auto;
  min-width: 76px;
  padding: 0.55rem 0.72rem;
  border-radius: 14px;
  scroll-snap-align: start;
}

.detail-credit-payment {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0.82rem 1rem;
  border-radius: 18px;
  border: 1px solid rgba(72, 122, 93, 0.2);
  background: linear-gradient(135deg, #eef8f1 0%, #d8efe1 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.detail-credit-inline-value {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  white-space: nowrap;
  font-size: clamp(0.95rem, 1.8vw, 1.12rem);
  line-height: 1;
  font-weight: 800;
  color: #184b33;
  font-variant-numeric: tabular-nums;
}

.detail-credit-inline-separator {
  color: rgba(24, 75, 51, 0.48);
  font-weight: 700;
}

.detail-credit-inline-note {
  font-size: 0.74rem;
  font-weight: 600;
  color: rgba(17, 17, 17, 0.72);
}

.detail-price-sticky {
  position: fixed;
  top: 88px;
  left: 0;
  right: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: min(620px, calc(100vw - 1.5rem));
  margin: 0 auto;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(20, 35, 56, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(10px);
}

.detail-price-sticky-label {
  color: #6a7a90;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.detail-price-sticky-value {
  color: var(--detail-ink);
  font-size: clamp(1.15rem, 2.2vw, 1.45rem);
  line-height: 1.05;
}

.detail-price-sticky-fade-enter-active,
.detail-price-sticky-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.detail-price-sticky-fade-enter-from,
.detail-price-sticky-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.detail-actions {
  display: grid;
  gap: 1rem;
}

.credit-plan-switcher {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.7rem;
}

.credit-plan-btn {
  border: 1px solid rgba(72, 122, 93, 0.18);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, #f3faf5 100%);
  color: #2f5d45;
  padding: 0.55rem 0.72rem;
  min-width: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 700;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.credit-plan-btn:not(.credit-plan-btn-active):hover {
  border-color: rgba(72, 122, 93, 0.3);
  background: #f5fbf7;
}

.credit-plan-btn-active {
  background: linear-gradient(135deg, #2f7a57 0%, #1f6546 100%);
  color: #ffffff;
  border-color: #245f42;
  box-shadow: 0 10px 24px rgba(31, 101, 70, 0.22);
}

.credit-plan-btn-active:hover {
  background: linear-gradient(135deg, #2f7a57 0%, #1f6546 100%);
  color: #ffffff;
  border-color: #245f42;
}

.detail-options {
  background: var(--detail-surface);
}

.detail-options-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.15rem;
  border-bottom: 1px solid rgba(20, 35, 56, 0.08);
}

.detail-options-kicker {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #64748b;
}

.detail-option-group {
  display: grid;
  gap: 0.8rem;
  padding-top: 0.95rem;
  border-top: 1px solid rgba(20, 35, 56, 0.08);
}

.detail-option-group:first-of-type {
  padding-top: 0;
  border-top: none;
}

.balloon-program-toggle {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding-top: 0.2rem;
}

.balloon-program-toggle-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
}

.balloon-program-toggle-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface);
  color: #64748b;
  padding: 0.7rem 1rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    font-weight 0.15s ease;
}

.balloon-program-toggle-btn:hover {
  border-color: rgba(24, 48, 79, 0.24);
  background: var(--detail-surface-muted);
  color: var(--detail-ink);
}

.balloon-program-toggle-btn-active {
  border-color: var(--detail-accent);
  background: var(--detail-accent);
  color: #ffffff;
  font-weight: 800;
}

.balloon-program-toggle-btn-active:hover {
  background: var(--detail-accent);
  color: #ffffff;
}

.detail-select-shell {
  width: 100%;
}

.detail-select-wrap {
  position: relative;
  width: 100%;
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(242, 246, 251, 0.96));
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.06);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.detail-select-wrap:hover {
  border-color: rgba(24, 48, 79, 0.22);
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.detail-select-wrap:focus-within {
  border-color: rgba(24, 48, 79, 0.3);
  box-shadow: 0 0 0 4px rgba(24, 48, 79, 0.08);
}

.detail-select-wrap-active {
  border-color: rgba(24, 48, 79, 0.18);
  background:
    linear-gradient(180deg, rgba(249, 251, 253, 0.98), rgba(238, 243, 248, 0.98));
}

.detail-select-input {
  width: 100%;
  min-height: 58px;
  appearance: none;
  border: none;
  background: transparent;
  color: var(--detail-ink);
  font-size: 0.97rem;
  font-weight: 700;
  padding: 0.95rem 3rem 0.95rem 1rem;
  outline: none;
}

.detail-static-value {
  min-height: 58px;
  display: flex;
  align-items: center;
  color: var(--detail-ink);
  font-size: 0.97rem;
  font-weight: 700;
  padding: 0.95rem 1rem;
}

.detail-select-icon {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #5d728f;
  font-size: 1.1rem;
  pointer-events: none;
}

.detail-option-headline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.detail-option-heading {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.detail-option-grid-fuel {
  flex-wrap: nowrap;
}

.detail-option-grid-fuel .detail-option {
  width: calc(50% - 0.25rem);
  min-width: 0;
}

.detail-info-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(20, 35, 56, 0.12);
  background: var(--detail-surface-muted);
  color: #60738d;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.detail-info-trigger:hover {
  border-color: rgba(24, 48, 79, 0.22);
  background: var(--detail-accent-soft);
  color: var(--detail-accent);
}

.detail-option {
  min-width: 132px;
  border-radius: 16px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-muted);
  color: var(--detail-ink);
  padding: 0.8rem 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
}

.detail-option:hover {
  border-color: rgba(24, 48, 79, 0.24);
  background: var(--detail-accent-soft);
  color: var(--detail-ink);
}

.detail-option:hover .detail-option-meta {
  color: #5f7087;
}

.detail-option-active {
  border-color: var(--detail-accent);
  background: var(--detail-accent);
  color: #ffffff;
}

.detail-option-active:hover {
  border-color: var(--detail-accent);
  background: var(--detail-accent);
  color: #ffffff;
}

.detail-option-meta {
  font-size: 0.75rem;
  font-weight: 600;
  color: #708198;
}

.detail-option-active .detail-option-meta {
  color: rgba(255, 255, 255, 0.72);
}

.detail-order-tools {
  gap: 1rem;
}

.detail-order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.15rem;
  border-bottom: 1px solid rgba(20, 35, 56, 0.08);
}

.detail-order-total {
  color: var(--detail-ink);
  font-size: 1.2rem;
  line-height: 1.2;
}

.detail-primary-actions {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 0.85rem;
}

.detail-add-btn {
  background: var(--detail-accent);
  border: 1px solid var(--detail-accent);
  min-width: 220px;
}

.detail-add-btn:hover {
  background: #12263d;
  border-color: #12263d;
}

.detail-order-btn {
  min-width: 220px;
  border-radius: 18px;
  border: 1px solid var(--detail-border-strong);
  background: var(--detail-surface);
  color: var(--detail-ink);
  padding: 1rem 1.2rem;
  font-weight: 700;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.detail-order-btn:hover {
  border-color: var(--detail-accent);
  background: var(--detail-accent-soft);
}

.detail-order-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.detail-add-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.detail-options-required-hint {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  line-height: 1.35;
  color: #b45309;
}

.order-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(8, 15, 24, 0.44);
}

.order-modal-panel {
  width: min(920px, 100%);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  border-radius: 28px;
  border: 1px solid var(--detail-border);
  background: #fcfcfb;
  padding: 1.35rem;
}

.fuel-guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(6px);
}

.fuel-guide-panel {
  width: min(980px, 100%);
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  border-radius: 28px;
  border: 1px solid var(--detail-border);
  background: #fcfcfb;
  padding: 1.35rem;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.16);
}

.fuel-guide-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.fuel-guide-title {
  margin-top: 0.3rem;
  color: #142338;
  font-size: clamp(1.25rem, 2vw, 1.65rem);
  font-weight: 800;
}

.fuel-guide-intro {
  margin-top: 0.6rem;
  max-width: 720px;
  color: #62758f;
  line-height: 1.6;
}

.fuel-guide-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1.15rem;
}

.fuel-guide-card {
  border-radius: 22px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: var(--detail-surface);
  padding: 1rem;
}

.fuel-guide-card-title {
  color: #142338;
  font-size: 1rem;
  font-weight: 800;
}

.fuel-guide-columns {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  margin-top: 0.85rem;
}

.fuel-guide-column {
  border-radius: 18px;
  background: var(--detail-surface-muted);
  padding: 0.9rem;
}

.fuel-guide-column-title {
  color: #18304f;
  font-size: 0.92rem;
  font-weight: 800;
}

.fuel-guide-list {
  margin-top: 0.7rem;
  padding-left: 1rem;
  color: #44576f;
  display: grid;
  gap: 0.5rem;
  line-height: 1.55;
}

.fuel-guide-note {
  margin-top: 1rem;
  color: #5f7290;
  font-size: 0.92rem;
  line-height: 1.6;
}

.order-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.order-modal-kicker {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6a7d71;
}

.order-modal-title {
  margin-top: 0.3rem;
  color: #142338;
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  font-weight: 800;
}

.order-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface);
  color: var(--detail-accent);
  transition:
    background 0.2s ease,
    border-color 0.2s ease;
}

.order-modal-close:hover:not(:disabled) {
  background: var(--detail-surface-muted);
  border-color: var(--detail-border-strong);
}

.order-modal-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem 1.1rem;
  border-radius: 20px;
  background: var(--detail-surface-muted);
  border: 1px solid rgba(20, 35, 56, 0.08);
}

.order-modal-summary-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #64748b;
}

.order-modal-summary-value {
  display: block;
  margin-top: 0.35rem;
  color: #142338;
  font-size: 1.15rem;
}

.order-option-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.9rem;
}

.order-option-chip {
  border-radius: 999px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #ffffff;
  color: #455a74;
  padding: 0.45rem 0.8rem;
  font-size: 0.78rem;
  font-weight: 600;
}

.order-type-switcher {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.1rem;
}

.order-type-btn {
  border-radius: 16px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface);
  color: #304660;
  padding: 0.85rem 1rem;
  font-weight: 700;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.order-type-btn:hover {
  border-color: var(--detail-border-strong);
  background: var(--detail-surface-muted);
}

.order-type-btn-active {
  background: var(--detail-accent);
  color: #ffffff;
  border-color: var(--detail-accent);
}

.order-modal-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1.1rem;
}

.order-field {
  display: grid;
  gap: 0.42rem;
}

.order-field span {
  font-size: 0.84rem;
  font-weight: 700;
  color: #304660;
}

.order-field-full {
  grid-column: 1 / -1;
}

.order-input {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--detail-border);
  background: #ffffff;
  color: #1b2d44;
  padding: 0.85rem 0.95rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.order-input:focus {
  border-color: var(--detail-accent);
  background: #ffffff;
}

.order-error {
  margin-top: 0.9rem;
  color: #b42318;
  font-size: 0.9rem;
  font-weight: 600;
}

.order-submit-btn {
  width: 100%;
  margin-top: 1rem;
  border-radius: 18px;
  border: 1px solid var(--detail-accent);
  background: var(--detail-accent);
  color: #ffffff;
  padding: 1rem 1.2rem;
  font-weight: 800;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;
}

.order-submit-btn:hover:not(:disabled) {
  background: #12263d;
  border-color: #12263d;
}

.order-submit-btn:disabled,
.order-modal-close:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.detail-copy-section {
  margin-top: 0.35rem;
  border-top: 1px solid var(--detail-border);
  padding-top: 1rem;
}

.detail-tabs {
  border-bottom: 1px solid var(--detail-border);
  padding-bottom: 0.6rem;
  margin-bottom: 0;
  gap: 1.25rem;
}

.detail-tab {
  color: var(--detail-subtle);
  cursor: pointer;
  border-bottom: 1px solid transparent;
  padding-bottom: 0.45rem;
}

.detail-tab-active {
  color: var(--detail-accent);
  border-bottom-color: var(--detail-accent);
}

.detail-copy-body {
  padding-top: 0.75rem;
}

.detail-content {
  display: block;
  color: #46566c;
  line-height: 1.78;
  font-size: 0.98rem;
}

.detail-content :deep(p),
.detail-content :deep(ul),
.detail-content :deep(ol) {
  margin-bottom: 0.95rem;
}

.detail-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.detail-content :deep(td),
.detail-content :deep(th) {
  border: 1px solid rgba(20, 35, 56, 0.08);
  padding: 0.65rem;
}

.detail-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 18px;
}

.related-section {
  margin-top: 2.25rem;
  border-top: 1px solid var(--detail-border);
  padding-top: 1.4rem;
}

.related-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.related-heading {
  color: var(--detail-ink);
  letter-spacing: -0.02em;
}

.related-grid {
  gap: 1.1rem;
}

.buttonShop {
  background: var(--detail-accent);
  border: 1px solid var(--detail-accent);
  transition:
    transform 0.25s ease,
    background 0.25s ease,
    border-color 0.25s ease;
}

.related-btn:hover {
  transform: translateY(-1px);
  background: #12263d;
  border-color: #12263d;
}

.related-card {
  border-radius: 24px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface);
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  opacity: 0;
  transform: translateY(20px) scale(0.95);
  transition:
    opacity 0.7s ease-out,
    transform 0.7s ease-out,
    border-color 0.3s ease;
}

.related-card:hover {
  border-color: var(--detail-border-strong);
}

.related-card.animate-show {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.related-media {
  position: relative;
  min-height: 188px;
  height: 188px;
  border-radius: 20px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: var(--detail-surface-muted);
  overflow: hidden;
}

.related-chip {
  position: absolute;
  left: 10px;
  top: 10px;
  border-radius: 999px;
  border: 1px solid rgba(20, 35, 56, 0.08);
  background: #ffffff;
  color: #41536f;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 800;
}

.related-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  padding: 1rem;
  transition: transform 0.45s ease;
}

.related-card:hover .related-image {
  transform: scale(1.04);
}

.related-title {
  margin-top: 10px;
  color: #1b2d44;
  text-align: left;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  min-height: 42px;
  cursor: pointer;
}

.related-price {
  margin-top: 8px;
  margin-bottom: 10px;
  color: #142338;
  font-size: 1rem;
  font-weight: 800;
  text-align: left;
}

.related-cart-icon {
  left: 12px;
}

.animate-fade-in-down {
  animation: fadeInDown 0.8s ease-out forwards;
}

.animate-slide-in-up {
  animation: slideInUp 0.8s ease-out forwards;
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out forwards;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 1024px) {
  .detail-main {
    grid-template-columns: 1fr;
  }

  .detail-price-sticky {
    top: 84px;
  }

  .related-title {
    font-size: 0.88rem;
  }

  .related-price {
    font-size: 0.92rem;
  }

  .related-cart-icon {
    left: 9px;
  }

  .detail-primary-actions,
  .detail-add-btn,
  .detail-order-btn {
    width: 100%;
  }

  .order-modal-panel {
    width: min(760px, 100%);
  }
}

@media (max-width: 640px) {
  .detail-page {
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }

  .detail-topbar {
    padding-inline: 3.2rem;
  }

  /* Orqaga: skroll qilganda ham ko‘rinadi (nav ostida, sticky narx ustida) */
  .detail-back {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 6.25rem);
    left: max(0.75rem, env(safe-area-inset-left, 0px));
    transform: none;
    z-index: 998;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
    background: rgba(255, 255, 255, 0.96);
    backdrop-filter: blur(10px);
  }

  .detail-main {
    gap: 1rem;
  }

  .detail-gallery-stage {
    border-radius: 22px;
    padding: 0;
  }

  .detail-section {
    border-radius: 22px;
    padding: 0.9rem;
  }

  .detail-price-box {
    width: 100%;
  }

  .detail-price-sticky {
    top: 74px;
    padding: 0.82rem 0.9rem;
    border-radius: 18px;
  }

  .detail-price-sticky-value {
    font-size: 1.04rem;
  }

  .detail-credit-inline {
    gap: 0.75rem;
  }

  .detail-credit-inline-value {
    gap: 0.34rem;
    font-size: 0.88rem;
  }

  .detail-credit-plan-switcher .credit-plan-btn,
  .credit-plan-btn {
    min-width: 72px;
    width: auto;
    font-size: 0.76rem;
  }

  .detail-option-grid-transmission .detail-option {
    width: calc(50% - 0.25rem);
    min-width: 0;
  }

  .detail-option-grid-fuel .detail-option {
    width: calc(50% - 0.25rem);
    min-width: 0;
  }

  .detail-option {
    width: 100%;
  }

  .detail-order-tools,
  .detail-primary-actions,
  .order-type-switcher {
    flex-direction: column;
  }

  .detail-order-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .order-modal-panel {
    padding: 1rem;
    border-radius: 22px;
  }

  .fuel-guide-overlay {
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
  }

  .fuel-guide-panel {
    width: 100%;
    max-height: min(82vh, 720px);
    padding: 0.95rem;
    border-radius: 22px 22px 18px 18px;
  }

  .order-modal-head,
  .order-modal-summary,
  .fuel-guide-head {
    flex-direction: column;
    align-items: stretch;
  }

  .fuel-guide-head .order-modal-close {
    align-self: flex-end;
    width: 38px;
    height: 38px;
  }

  .fuel-guide-title {
    font-size: 1.1rem;
    line-height: 1.25;
  }

  .fuel-guide-intro {
    margin-top: 0.45rem;
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .fuel-guide-grid {
    gap: 0.8rem;
    margin-top: 0.95rem;
  }

  .fuel-guide-card {
    border-radius: 18px;
    padding: 0.85rem;
  }

  .fuel-guide-card-title {
    font-size: 0.94rem;
    line-height: 1.3;
  }

  .fuel-guide-columns {
    grid-template-columns: 1fr;
    gap: 0.7rem;
    margin-top: 0.7rem;
  }

  .fuel-guide-column {
    border-radius: 16px;
    padding: 0.8rem;
  }

  .fuel-guide-column-title {
    font-size: 0.86rem;
  }

  .fuel-guide-list {
    margin-top: 0.55rem;
    gap: 0.42rem;
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .fuel-guide-note {
    margin-top: 0.85rem;
    font-size: 0.86rem;
    line-height: 1.45;
  }

  .order-modal-form-grid {
    grid-template-columns: 1fr;
  }

  .order-field-full {
    grid-column: auto;
  }

  .detail-swiper,
  .detail-slide-image {
    height: 320px;
  }
}
</style>
