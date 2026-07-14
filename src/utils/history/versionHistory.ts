import type { TPortfolioData } from "../../types/portfolio";
import { clonePortfolio, normalizePortfolio } from "./clone";
import {
  HISTORY_LIMITS,
  VERSIONS_STORAGE_KEY,
  type VersionEntry,
  type VersionStoreV1,
} from "./types";
import { profileVersionsKey } from "../profiles/types";
import {
  internPortfolioAssets,
  resolvePortfolioAssets,
} from "../profiles/assets";

/** Active profile for version history ops (set by PortfolioProvider). */
let activeProfileId: string | null = null;

export function setVersionHistoryProfileId(profileId: string | null): void {
  activeProfileId = profileId;
}

export function getVersionHistoryProfileId(): string | null {
  return activeProfileId;
}

function versionsKey(): string {
  return activeProfileId
    ? profileVersionsKey(activeProfileId)
    : VERSIONS_STORAGE_KEY;
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ver-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readStore(): VersionStoreV1 {
  try {
    const raw = localStorage.getItem(versionsKey());
    if (!raw) return { v: 1, entries: [] };
    const parsed = JSON.parse(raw) as VersionStoreV1;
    if (parsed?.v !== 1 || !Array.isArray(parsed.entries)) {
      return { v: 1, entries: [] };
    }
    const seen = new Set<string>();
    const entries = parsed.entries
      .map((e) => {
        const data = normalizePortfolio(e.data);
        if (!data || !e.id) return null;
        return {
          id: e.id,
          at: typeof e.at === "number" ? e.at : Date.now(),
          label: e.label || "Snapshot",
          data: resolvePortfolioAssets(data),
        } satisfies VersionEntry;
      })
      .filter(Boolean)
      // Keep last occurrence of each id (newest write wins if storage was corrupted)
      .reduceRight<VersionEntry[]>((acc, entry) => {
        const e = entry as VersionEntry;
        if (seen.has(e.id)) return acc;
        seen.add(e.id);
        acc.unshift(e);
        return acc;
      }, []);
    return { v: 1, entries };
  } catch {
    return { v: 1, entries: [] };
  }
}

/** Marker SVG used when a snapshot was trimmed to fit localStorage. */
export const TRIMMED_ICON_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
)}`;

export function isTrimmedIconPlaceholder(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value === TRIMMED_ICON_PLACEHOLDER) return true;
  if (!value.startsWith("data:image/svg+xml")) return false;
  return (
    (value.includes('width="1"') || value.includes("width%3D%221%22")) &&
    (value.includes('height="1"') || value.includes("height%3D%221%22"))
  );
}

function stripHeavyDataUrls(data: TPortfolioData): TPortfolioData {
  const next = clonePortfolio(data);
  const scrub = (s: string) =>
    s.startsWith("data:image/") && s.length > 2_000
      ? TRIMMED_ICON_PLACEHOLDER
      : s;

  next.technologies = next.technologies.map((t) => ({
    ...t,
    icon: scrub(t.icon),
  }));
  next.services = next.services.map((s) => ({ ...s, icon: scrub(s.icon) }));
  next.experiences = next.experiences.map((e) => ({
    ...e,
    icon: scrub(e.icon),
  }));
  next.projects = next.projects.map((p) => ({ ...p, image: scrub(p.image) }));
  next.testimonials = next.testimonials.map((t) => ({
    ...t,
    image: scrub(t.image),
  }));
  return next;
}

function writeStore(store: VersionStoreV1): boolean {
  try {
    let entries = store.entries.slice(-HISTORY_LIMITS.maxVersions);
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        localStorage.setItem(
          versionsKey(),
          JSON.stringify({ v: 1, entries })
        );
        return true;
      } catch {
        if (entries.length > 1) {
          entries = entries.slice(1);
          continue;
        }
        // Last entry still too large — strip heavy data URLs
        if (entries.length === 1) {
          entries = [
            {
              ...entries[0],
              data: stripHeavyDataUrls(entries[0].data),
              label: `${entries[0].label} (icons trimmed)`,
            },
          ];
          try {
            localStorage.setItem(
              versionsKey(),
              JSON.stringify({ v: 1, entries })
            );
            return true;
          } catch {
            console.warn(
              "Version history storage full; could not persist snapshot."
            );
            return false;
          }
        }
        return false;
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

export type AppendVersionResult = {
  entry: VersionEntry;
  persisted: boolean;
};

export function appendVersion(
  data: TPortfolioData,
  label: string
): AppendVersionResult {
  let payload = internPortfolioAssets(clonePortfolio(data));
  const jsonLen = JSON.stringify(payload).length;
  if (jsonLen > HISTORY_LIMITS.maxSnapshotChars) {
    payload = stripHeavyDataUrls(payload);
  }

  const entry: VersionEntry = {
    id: newId(),
    at: Date.now(),
    label: label.trim() || "Snapshot",
    data: payload,
  };

  const store = readStore();
  store.entries = [...store.entries, entry].slice(-HISTORY_LIMITS.maxVersions);
  const persisted = writeStore(store);
  return { entry, persisted };
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
    localStorage.removeItem(versionsKey());
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
  appendVersion(data, label);
  return loadVersionHistory();
}
