import type { TPortfolioData } from "../../types/portfolio";
import { clonePortfolio, normalizePortfolio } from "./clone";
import { DRAFT_STORAGE_KEY, type DraftPersistV1 } from "./types";

export function loadPersistedDraft(): DraftPersistV1 | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPersistV1;
    if (parsed?.v !== 1 || !parsed.data) return null;
    const data = normalizePortfolio(parsed.data);
    if (!data) return null;
    return {
      v: 1,
      updatedAt: parsed.updatedAt || Date.now(),
      baseFingerprint: parsed.baseFingerprint || "",
      data,
    };
  } catch {
    return null;
  }
}

export function savePersistedDraft(
  data: TPortfolioData,
  baseFingerprint: string
): boolean {
  const payload: DraftPersistV1 = {
    v: 1,
    updatedAt: Date.now(),
    baseFingerprint,
    data: clonePortfolio(data),
  };
  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    // Quota — drop draft persist rather than crash; undo stack still in memory
    console.warn("Failed to persist unsaved draft", err);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return false;
  }
}

export function clearPersistedDraft(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
