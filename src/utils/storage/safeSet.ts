/**
 * Quota-safe localStorage writes with optional recovery callback.
 * Kept free of profile/asset imports to avoid circular deps.
 */

export type SafeSetOptions = {
  /** Called once after a quota failure before retrying setItem. */
  onQuota?: () => void;
};

export function isQuotaError(err: unknown): boolean {
  const name = (err as DOMException)?.name || "";
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    (err as { code?: number })?.code === 22
  );
}

export function safeSetItem(
  key: string,
  value: string,
  options?: SafeSetOptions
): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn("localStorage setItem failed", key, err);
      return false;
    }
    try {
      options?.onQuota?.();
    } catch (recoverErr) {
      console.warn("storage recovery callback failed", recoverErr);
    }
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err2) {
      console.warn("localStorage setItem failed after recovery", key, err2);
      try {
        options?.onQuota?.();
        localStorage.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
  }
}
