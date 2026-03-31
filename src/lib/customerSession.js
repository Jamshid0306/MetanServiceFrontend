const CUSTOMER_SESSION_STORAGE_KEY = "customer_profile";
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
  getCustomerStorage()?.removeItem(CUSTOMER_SESSION_STORAGE_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CUSTOMER_SESSION_EVENT));
  }
};
