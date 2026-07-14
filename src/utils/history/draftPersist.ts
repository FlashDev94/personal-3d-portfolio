import type { TPortfolioData } from "../../types/portfolio";
import { clonePortfolio, normalizePortfolio } from "./clone";
import { DRAFT_STORAGE_KEY, type DraftPersistV1 } from "./types";
import { profileDraftKey } from "../profiles/types";
import {
  internPortfolioAssets,
  resolvePortfolioAssets,
} from "../profiles/assets";
import { safeSetItem } from "../storage/safeSet";
import { recoverStorage } from "../storage/health";

function draftKey(profileId?: string | null): string {
  return profileId ? profileDraftKey(profileId) : DRAFT_STORAGE_KEY;
}

export function loadPersistedDraft(
  profileId?: string | null
): DraftPersistV1 | null {
  try {
    const raw = localStorage.getItem(draftKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftPersistV1;
    if (parsed?.v !== 1 || !parsed.data) return null;
    const data = normalizePortfolio(parsed.data);
    if (!data) return null;
    return {
      v: 1,
      updatedAt: parsed.updatedAt || Date.now(),
      baseFingerprint: parsed.baseFingerprint || "",
      data: resolvePortfolioAssets(data),
    };
  } catch {
    return null;
  }
}

export function savePersistedDraft(
  data: TPortfolioData,
  baseFingerprint: string,
  profileId?: string | null
): boolean {
  const payload: DraftPersistV1 = {
    v: 1,
    updatedAt: Date.now(),
    baseFingerprint,
    // Intern icons so drafts for multiple profiles share asset blobs
    data: internPortfolioAssets(clonePortfolio(data)),
  };
  const key = draftKey(profileId);
  const ok = safeSetItem(key, JSON.stringify(payload), {
    onQuota: () => {
      recoverStorage({ activeProfileId: profileId, aggressive: true });
    },
  });
  if (!ok) {
    console.warn("Failed to persist unsaved draft after recovery");
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  return ok;
}

export function clearPersistedDraft(profileId?: string | null): void {
  try {
    localStorage.removeItem(draftKey(profileId));
  } catch {
    /* ignore */
  }
}
