import { TAB_ID_KEY } from "./types";

/** Stable per-tab id for the lifetime of the browsing context. */
export function getTabId(): string {
  try {
    const existing = sessionStorage.getItem(TAB_ID_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(TAB_ID_KEY, id);
    return id;
  } catch {
    return `tab-${Date.now().toString(36)}`;
  }
}
