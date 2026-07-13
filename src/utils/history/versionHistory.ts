import type { TPortfolioData } from "../../types/portfolio";
import { clonePortfolio, normalizePortfolio } from "./clone";
import {
  HISTORY_LIMITS,
  VERSIONS_STORAGE_KEY,
  type VersionEntry,
  type VersionStoreV1,
} from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ver-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStore(): VersionStoreV1 {
  try {
    const raw = localStorage.getItem(VERSIONS_STORAGE_KEY);
    if (!raw) return { v: 1, entries: [] };
    const parsed = JSON.parse(raw) as VersionStoreV1;
    if (parsed?.v !== 1 || !Array.isArray(parsed.entries)) {
      return { v: 1, entries: [] };
    }
    const entries = parsed.entries
      .map((e) => {
        const data = normalizePortfolio(e.data);
        if (!data || !e.id) return null;
        return {
          id: e.id,
          at: typeof e.at === "number" ? e.at : Date.now(),
          label: e.label || "Snapshot",
          data,
        } satisfies VersionEntry;
      })
      .filter(Boolean) as VersionEntry[];
    return { v: 1, entries };
  } catch {
    return { v: 1, entries: [] };
  }
}

function writeStore(store: VersionStoreV1): boolean {
  try {
    let entries = store.entries.slice(-HISTORY_LIMITS.maxVersions);
    // Prune until it fits (custom icons can blow quota)
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        localStorage.setItem(
          VERSIONS_STORAGE_KEY,
          JSON.stringify({ v: 1, entries })
        );
        return true;
      } catch {
        if (entries.length <= 1) {
          // Last resort: drop largest data URLs from oldest entry
          if (entries.length === 1) {
            console.warn(
              "Version history storage full; could not persist snapshot."
            );
          }
          return false;
        }
        entries = entries.slice(1);
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function loadVersionHistory(): VersionEntry[] {
  return readStore().entries;
}

export function appendVersion(
  data: TPortfolioData,
  label: string
): VersionEntry | null {
  const entry: VersionEntry = {
    id: newId(),
    at: Date.now(),
    label: label.trim() || "Snapshot",
    data: clonePortfolio(data),
  };

  const jsonLen = JSON.stringify(entry.data).length;
  if (jsonLen > HISTORY_LIMITS.maxSnapshotChars) {
    console.warn(
      "Snapshot unusually large; still attempting to store version history.",
      jsonLen
    );
  }

  const store = readStore();
  // Skip exact consecutive duplicate labels+fingerprint-ish by id of last
  store.entries = [...store.entries, entry].slice(-HISTORY_LIMITS.maxVersions);
  const ok = writeStore(store);
  return ok ? entry : entry; // still return entry for in-memory UI even if disk fails
}

export function deleteVersion(id: string): VersionEntry[] {
  const store = readStore();
  store.entries = store.entries.filter((e) => e.id !== id);
  writeStore(store);
  return store.entries;
}

export function getVersion(id: string): VersionEntry | null {
  return readStore().entries.find((e) => e.id === id) ?? null;
}

export function clearVersionHistory(): void {
  try {
    localStorage.removeItem(VERSIONS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Seed an initial version if history is empty (first visit / upgrade). */
export function ensureSeedVersion(
  data: TPortfolioData,
  label = "Initial"
): VersionEntry[] {
  const store = readStore();
  if (store.entries.length > 0) return store.entries;
  const entry = appendVersion(data, label);
  return entry ? loadVersionHistory() : [];
}
