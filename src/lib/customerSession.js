const CUSTOMER_SESSION_STORAGE_KEY = "customer_profile";
const CUSTOMER_ACCESS_TOKEN_STORAGE_KEY = "customer_access_token";
export const CUSTOMER_SESSION_EVENT = "customer-session-updated";

export const normalizeCustomerPhone = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("998") && digits.length === 12) {
    return digits;
  }

  if (digits.length === 9) {
    return `998${digits}`;
  }

  return digits;
};

export const formatCustomerPhone = (value = "") => {
  const normalizedPhone = normalizeCustomerPhone(value);
  return normalizedPhone ? `+${normalizedPhone}` : "";
};

export const formatUzbekistanPhoneInput = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  const subscriberDigits = digits.startsWith("998") ? digits.slice(3) : digits;
  const trimmedDigits = subscriberDigits.slice(0, 9);

  if (!trimmedDigits) {
    return "+998";
  }

  const parts = [];
  if (trimmedDigits.slice(0, 2)) parts.push(trimmedDigits.slice(0, 2));
  if (trimmedDigits.slice(2, 5)) parts.push(trimmedDigits.slice(2, 5));
  if (trimmedDigits.slice(5, 7)) parts.push(trimmedDigits.slice(5, 7));
  if (trimmedDigits.slice(7, 9)) parts.push(trimmedDigits.slice(7, 9));

  return `+998 ${parts.join(" ")}`.trim();
};

export const ensureUzbekistanPhoneInput = (value = "") => {
  const formatted = formatUzbekistanPhoneInput(value);
  return formatted || "+998";
};

export const toCustomerSession = (customer = {}) => {
  const name = String(
    customer?.name ??
      customer?.first_name ??
      customer?.firstName ??
      ""
  ).trim();
  const phone = normalizeCustomerPhone(customer?.phone || "");

  if (!name) {
    return null;
  }

  return {
    id: customer?.id ?? null,
    name,
    phone,
    address: String(customer?.address ?? "").trim(),
    favorites: Array.isArray(customer?.favorites)
      ? customer.favorites
          .map((item) => Number(item))
          .filter((item) => Number.isFinite(item) && item > 0)
      : [],
    telegramUsername: String(
      customer?.telegram_username ?? customer?.telegramUsername ?? ""
    ).trim(),
    photoUrl: String(customer?.photo_url ?? customer?.photoUrl ?? "").trim(),
  };
};

const getCustomerStorage = () =>
  typeof window === "undefined" ? null : window.localStorage;

export const getStoredCustomerSession = () => {
  const rawValue = getCustomerStorage()?.getItem(CUSTOMER_SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const session = toCustomerSession(JSON.parse(rawValue));
    if (!session) {
      getCustomerStorage()?.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    }
    return session;
  } catch {
    getCustomerStorage()?.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    return null;
  }
};

export const getStoredCustomerAccessToken = () =>
  getCustomerStorage()?.getItem(CUSTOMER_ACCESS_TOKEN_STORAGE_KEY) || "";

export const storeCustomerAccessToken = (token = "") => {
  const storage = getCustomerStorage();
  if (!storage) {
    return;
  }

  const normalizedToken = String(token || "").trim();
  if (normalizedToken) {
    storage.setItem(CUSTOMER_ACCESS_TOKEN_STORAGE_KEY, normalizedToken);
  } else {
    storage.removeItem(CUSTOMER_ACCESS_TOKEN_STORAGE_KEY);
  }
};

export const storeCustomerSession = (customer = null) => {
  const storage = getCustomerStorage();
  if (!storage) {
    return;
  }

  const session = toCustomerSession(customer);

  if (!session) {
    storage.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_EVENT));
    return;
  }

  storage.setItem(CUSTOMER_SESSION_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_EVENT, { detail: session }));
};

export const clearCustomerSession = () => {
  const storage = getCustomerStorage();
  storage?.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
  storage?.removeItem(CUSTOMER_ACCESS_TOKEN_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_EVENT));
  }
};
