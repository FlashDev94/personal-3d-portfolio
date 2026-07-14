import type { TPortfolioData } from "../../types/portfolio";
import { ASSET_STORE_KEY, type AssetStoreV1 } from "./types";

function cloneJson<T>(data: T): T {
  return JSON.parse(JSON.stringify(data)) as T;
}

const ASSET_PREFIX = "asset:h1:";

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function readStore(): AssetStoreV1 {
  try {
    const raw = localStorage.getItem(ASSET_STORE_KEY);
    if (!raw) return { v: 1, blobs: {} };
    const parsed = JSON.parse(raw) as AssetStoreV1;
    if (parsed?.v !== 1 || !parsed.blobs || typeof parsed.blobs !== "object") {
      return { v: 1, blobs: {} };
    }
    return { v: 1, blobs: { ...parsed.blobs } };
  } catch {
    return { v: 1, blobs: {} };
  }
}

function writeStore(store: AssetStoreV1): boolean {
  try {
    localStorage.setItem(ASSET_STORE_KEY, JSON.stringify(store));
    return true;
  } catch (err) {
    console.warn("Asset store write failed (quota?)", err);
    // Drop oldest-ish keys until it fits (object key order is insertion order)
    const keys = Object.keys(store.blobs);
    let blobs = { ...store.blobs };
    while (keys.length > 0) {
      const drop = keys.shift()!;
      delete blobs[drop];
      try {
        localStorage.setItem(
          ASSET_STORE_KEY,
          JSON.stringify({ v: 1, blobs })
        );
        return true;
      } catch {
        /* keep pruning */
      }
    }
    return false;
  }
}

export function isAssetRef(value: string): boolean {
  return value.startsWith(ASSET_PREFIX);
}

/** Intern a heavy data-URL into the shared store; return a stable ref. */
export function internAsset(value: string): string {
  if (!value || typeof value !== "string") return value;
  if (isAssetRef(value)) return value;
  // Only intern sizable data URLs — small SVGs / remote URLs stay inline
  if (!value.startsWith("data:image/") || value.length < 256) return value;
  const hash = fnv1a(value);
  const ref = `${ASSET_PREFIX}${hash}`;
  const store = readStore();
  if (store.blobs[ref] !== value) {
    store.blobs[ref] = value;
    writeStore(store);
  }
  return ref;
}

export function resolveAsset(value: string): string {
  if (!value || !isAssetRef(value)) return value;
  const store = readStore();
  return store.blobs[value] ?? value;
}

function mapIcons(
  data: TPortfolioData,
  map: (icon: string) => string
): TPortfolioData {
  const next = cloneJson(data);
  next.technologies = next.technologies.map((t) => ({
    ...t,
    icon: map(t.icon),
  }));
  next.services = next.services.map((s) => ({ ...s, icon: map(s.icon) }));
  next.experiences = next.experiences.map((e) => ({
    ...e,
    icon: map(e.icon),
  }));
  next.projects = next.projects.map((p) => ({ ...p, image: map(p.image) }));
  next.testimonials = next.testimonials.map((t) => ({
    ...t,
    image: map(t.image),
  }));
  return next;
}

/** Replace data-URL icons with shared asset refs (dedupe across profiles). */
export function internPortfolioAssets(data: TPortfolioData): TPortfolioData {
  return mapIcons(data, internAsset);
}

/** Expand asset refs to displayable URLs for the live site / configurator. */
export function resolvePortfolioAssets(data: TPortfolioData): TPortfolioData {
  return mapIcons(data, resolveAsset);
}

/** Collect asset refs referenced by a portfolio snapshot. */
export function collectAssetRefs(data: TPortfolioData): string[] {
  const refs = new Set<string>();
  const consider = (s: string) => {
    if (isAssetRef(s)) refs.add(s);
  };
  data.technologies.forEach((t) => consider(t.icon));
  data.services.forEach((s) => consider(s.icon));
  data.experiences.forEach((e) => consider(e.icon));
  data.projects.forEach((p) => consider(p.image));
  data.testimonials.forEach((t) => consider(t.image));
  return [...refs];
}

export function assetStoreStats(): { count: number; approxChars: number } {
  const store = readStore();
  const keys = Object.keys(store.blobs);
  let approxChars = 0;
  for (const k of keys) approxChars += store.blobs[k]?.length ?? 0;
  return { count: keys.length, approxChars };
}
