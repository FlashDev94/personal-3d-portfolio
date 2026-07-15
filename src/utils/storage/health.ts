/**
 * Storage health, consistency checks, and recovery for multi-profile portfolios.
 *
 * Goals when localStorage is near full or multi-tab races leave orphans:
 *  - Prefer GC of unreferenced assets and old version history
 *  - Never drop the active profile's applied config if we can free space first
 *  - Keep registry, configs, drafts, versions, and the asset store aligned
 */

import {
  ASSET_STORE_KEY,
  PROFILE_CONFIG_PREFIX,
  PROFILE_DRAFT_PREFIX,
  PROFILE_REGISTRY_KEY,
  PROFILE_VERSIONS_PREFIX,
  type ProfileId,
  type ProfileRegistryV1,
} from "../profiles/types";
import {
  collectAssetRefs,
  invalidateAssetStoreCache,
  isAssetRef,
  resolveAsset,
} from "../profiles/assets";
import { DRAFT_STORAGE_KEY, VERSIONS_STORAGE_KEY } from "../history/types";

/** Legacy flat config key (keep literal to avoid importing defaults → asset PNGs in Node tests). */
const LEGACY_CONFIG_KEY = "portfolio-config-v1";

export type StorageHealthLevel = "ok" | "warn" | "critical" | "full";

export type StorageIssue = {
  code: string;
  message: string;
  key?: string;
};

export type StorageHealthReport = {
  level: StorageHealthLevel;
  usedBytes: number;
  /** Best-effort quota estimate (5MB default when browser does not report). */
  quotaBytes: number;
  usageRatio: number;
  keyCount: number;
  issues: StorageIssue[];
  profileCount: number;
  assetBlobCount: number;
  orphanAssetCount: number;
  orphanKeyCount: number;
};

export type RecoveryAction =
  | "gc_assets"
  | "prune_versions"
  | "drop_orphan_keys"
  | "drop_idle_drafts"
  | "trim_legacy"
  | "none";

export type RecoveryResult = {
  ok: boolean;
  actions: RecoveryAction[];
  freedApproxBytes: number;
  report: StorageHealthReport;
};

/** Soft thresholds as fraction of estimated quota. */
export const STORAGE_THRESHOLDS = {
  warn: 0.7,
  critical: 0.88,
  full: 0.97,
} as const;

const LOCK_KEY = "portfolio-storage-lock-v1";
const LOCK_TTL_MS = 2500;

function byteLen(s: string): number {
  // UTF-16 localStorage accounting is roughly 2 bytes/char in many browsers
  return s.length * 2;
}

export function measureLocalStorageBytes(): {
  usedBytes: number;
  keyCount: number;
  entries: { key: string; bytes: number }[];
} {
  const entries: { key: string; bytes: number }[] = [];
  let usedBytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) ?? "";
      const bytes = byteLen(key) + byteLen(val);
      entries.push({ key, bytes });
      usedBytes += bytes;
    }
  } catch {
    /* private mode etc. */
  }
  entries.sort((a, b) => b.bytes - a.bytes);
  return { usedBytes, keyCount: entries.length, entries };
}

/** Estimate quota: StorageManager when available, else 5 MiB heuristic. */
export async function estimateQuotaBytes(): Promise<number> {
  try {
    if (navigator?.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota && est.quota > 0) {
        // localStorage is typically a small slice; clamp to a realistic LS ceiling
        return Math.min(est.quota, 10 * 1024 * 1024);
      }
    }
  } catch {
    /* ignore */
  }
  return 5 * 1024 * 1024;
}

function readRegistrySafe(): ProfileRegistryV1 | null {
  try {
    const raw = localStorage.getItem(PROFILE_REGISTRY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileRegistryV1;
    if (parsed?.v !== 1 || !Array.isArray(parsed.profiles)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function listKeysWithPrefix(prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) keys.push(k);
    }
  } catch {
    /* ignore */
  }
  return keys;
}

function parseJsonSafe(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Collect every asset ref still referenced by configs, drafts, or versions. */
export function collectAllReferencedAssetRefs(): Set<string> {
  const refs = new Set<string>();
  const considerRaw = (raw: string | null) => {
    if (!raw) return;
    // Fast path: only parse if it mentions asset refs
    if (!raw.includes("asset:h1:")) return;
    const data = parseJsonSafe(raw);
    if (!data || typeof data !== "object") return;
    // Config / draft shape: full portfolio or { data: portfolio }
    const payload =
      "data" in (data as object) &&
      (data as { data?: unknown }).data &&
      typeof (data as { data: unknown }).data === "object"
        ? (data as { data: unknown }).data
        : data;
    try {
      // Walk string leaves for refs without full type dependency
      const walk = (v: unknown) => {
        if (typeof v === "string") {
          if (isAssetRef(v)) refs.add(v);
          return;
        }
        if (Array.isArray(v)) {
          v.forEach(walk);
          return;
        }
        if (v && typeof v === "object") {
          for (const val of Object.values(v as Record<string, unknown>)) {
            walk(val);
          }
        }
      };
      walk(payload);
    } catch {
      /* ignore corrupt */
    }
  };

  considerRaw(localStorage.getItem(LEGACY_CONFIG_KEY));
  considerRaw(localStorage.getItem(DRAFT_STORAGE_KEY));
  considerRaw(localStorage.getItem(VERSIONS_STORAGE_KEY));

  for (const k of listKeysWithPrefix(PROFILE_CONFIG_PREFIX)) {
    considerRaw(localStorage.getItem(k));
  }
  for (const k of listKeysWithPrefix(PROFILE_DRAFT_PREFIX)) {
    considerRaw(localStorage.getItem(k));
  }
  for (const k of listKeysWithPrefix(PROFILE_VERSIONS_PREFIX)) {
    considerRaw(localStorage.getItem(k));
  }

  // Also use typed collector when parse succeeds as portfolio-like
  try {
    for (const k of listKeysWithPrefix(PROFILE_CONFIG_PREFIX)) {
      const raw = localStorage.getItem(k);
      const p = parseJsonSafe(raw);
      if (p && typeof p === "object" && "technologies" in (p as object)) {
        collectAssetRefs(p as Parameters<typeof collectAssetRefs>[0]).forEach(
          (r) => refs.add(r)
        );
      }
    }
  } catch {
    /* ignore */
  }

  return refs;
}

export function countOrphanAssets(): number {
  try {
    const raw = localStorage.getItem(ASSET_STORE_KEY);
    if (!raw) return 0;
    const store = JSON.parse(raw) as { blobs?: Record<string, string> };
    const blobs = store?.blobs || {};
    const refs = collectAllReferencedAssetRefs();
    return Object.keys(blobs).filter((k) => !refs.has(k)).length;
  } catch {
    return 0;
  }
}

/**
 * Remove asset blobs not referenced by any profile config/draft/version.
 * Returns approximate bytes freed (UTF-16 heuristic).
 */
export function gcOrphanAssets(): number {
  try {
    const raw = localStorage.getItem(ASSET_STORE_KEY);
    if (!raw) return 0;
    const store = JSON.parse(raw) as { v: 1; blobs: Record<string, string> };
    if (!store?.blobs) return 0;
    const refs = collectAllReferencedAssetRefs();
    let freed = 0;
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(store.blobs)) {
      if (refs.has(k)) next[k] = v;
      else freed += byteLen(k) + byteLen(v);
    }
    if (freed === 0) return 0;
    localStorage.setItem(ASSET_STORE_KEY, JSON.stringify({ v: 1, blobs: next }));
    invalidateAssetStoreCache();
    return freed;
  } catch {
    return 0;
  }
}

/**
 * Drop storage keys for profile ids not in the registry (orphans after tab races).
 */
export function dropOrphanProfileKeys(): { dropped: string[]; freed: number } {
  const reg = readRegistrySafe();
  const valid = new Set((reg?.profiles || []).map((p) => p.id));
  const dropped: string[] = [];
  let freed = 0;

  const consider = (key: string, id: string) => {
    if (valid.has(id)) return;
    try {
      const val = localStorage.getItem(key) ?? "";
      freed += byteLen(key) + byteLen(val);
      localStorage.removeItem(key);
      dropped.push(key);
    } catch {
      /* ignore */
    }
  };

  for (const k of listKeysWithPrefix(PROFILE_CONFIG_PREFIX)) {
    consider(k, k.slice(PROFILE_CONFIG_PREFIX.length));
  }
  for (const k of listKeysWithPrefix(PROFILE_DRAFT_PREFIX)) {
    consider(k, k.slice(PROFILE_DRAFT_PREFIX.length));
  }
  for (const k of listKeysWithPrefix(PROFILE_VERSIONS_PREFIX)) {
    consider(k, k.slice(PROFILE_VERSIONS_PREFIX.length));
  }

  return { dropped, freed };
}

/**
 * Prune oldest version entries across profiles (keep at least `keepPerProfile`).
 */
export function pruneOldestVersions(keepPerProfile = 3): number {
  let freed = 0;
  const keys = [
    VERSIONS_STORAGE_KEY,
    ...listKeysWithPrefix(PROFILE_VERSIONS_PREFIX),
  ];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const store = JSON.parse(raw) as { v: 1; entries?: unknown[] };
      if (!Array.isArray(store.entries) || store.entries.length <= keepPerProfile) {
        continue;
      }
      const before = raw.length;
      store.entries = store.entries.slice(-keepPerProfile);
      const next = JSON.stringify(store);
      localStorage.setItem(key, next);
      freed += Math.max(0, (before - next.length) * 2);
    } catch {
      /* ignore */
    }
  }
  return freed;
}

/** Drop drafts for non-active profiles when space is critical. */
export function dropIdleDrafts(activeId?: ProfileId | null): number {
  let freed = 0;
  const keys = listKeysWithPrefix(PROFILE_DRAFT_PREFIX);
  for (const key of keys) {
    const id = key.slice(PROFILE_DRAFT_PREFIX.length);
    if (activeId && id === activeId) continue;
    try {
      const val = localStorage.getItem(key) ?? "";
      freed += byteLen(key) + byteLen(val);
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  // Legacy draft
  if (!activeId) {
    try {
      const val = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (val) {
        freed += byteLen(DRAFT_STORAGE_KEY) + byteLen(val);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }
  return freed;
}

/**
 * Ensure registry points at existing configs; drop corrupt profile entries.
 * Returns true if registry was rewritten.
 */
export function repairRegistryConsistency(): boolean {
  const reg = readRegistrySafe();
  if (!reg) return false;
  let changed = false;
  const profiles = reg.profiles.filter((p) => {
    if (!p?.id || !p.slug) {
      changed = true;
      return false;
    }
    const cfg = localStorage.getItem(
      `${PROFILE_CONFIG_PREFIX}${p.id}`
    );
    if (!cfg) {
      // Keep entry but note — seed empty is handled by loaders
      return true;
    }
    try {
      JSON.parse(cfg);
      return true;
    } catch {
      changed = true;
      try {
        localStorage.removeItem(`${PROFILE_CONFIG_PREFIX}${p.id}`);
      } catch {
        /* ignore */
      }
      return false;
    }
  });

  if (!profiles.length) return false;

  let activeId = reg.activeId;
  if (!profiles.some((p) => p.id === activeId)) {
    activeId = profiles[0].id;
    changed = true;
  }

  if (profiles.length !== reg.profiles.length) changed = true;

  if (changed) {
    try {
      localStorage.setItem(
        PROFILE_REGISTRY_KEY,
        JSON.stringify({ v: 1, activeId, profiles })
      );
    } catch {
      return false;
    }
  }
  return changed;
}

/**
 * Best-effort multi-tab lock so only one tab runs aggressive recovery at a time.
 */
export function tryAcquireStorageLock(owner: string): boolean {
  try {
    const now = Date.now();
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { owner: string; until: number };
      if (parsed.until > now && parsed.owner !== owner) return false;
    }
    localStorage.setItem(
      LOCK_KEY,
      JSON.stringify({ owner, until: now + LOCK_TTL_MS })
    );
    // Re-read to detect races
    const check = JSON.parse(localStorage.getItem(LOCK_KEY) || "{}") as {
      owner?: string;
    };
    return check.owner === owner;
  } catch {
    return true; // proceed without lock if storage broken
  }
}

export function releaseStorageLock(owner: string): void {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { owner: string };
    if (parsed.owner === owner) localStorage.removeItem(LOCK_KEY);
  } catch {
    /* ignore */
  }
}

export function diagnoseStorage(quotaBytes = 5 * 1024 * 1024): StorageHealthReport {
  const { usedBytes, keyCount } = measureLocalStorageBytes();
  const usageRatio = quotaBytes > 0 ? usedBytes / quotaBytes : 0;
  const reg = readRegistrySafe();
  const issues: StorageIssue[] = [];
  const orphanAssetCount = countOrphanAssets();
  const { dropped } = dropOrphanProfileKeysDryRun();

  if (orphanAssetCount > 0) {
    issues.push({
      code: "orphan_assets",
      message: `${orphanAssetCount} unreferenced asset blob(s) can be reclaimed`,
    });
  }
  if (dropped.length > 0) {
    issues.push({
      code: "orphan_keys",
      message: `${dropped.length} storage key(s) not in the profile registry`,
    });
  }

  // Broken JSON keys
  for (const prefix of [
    PROFILE_CONFIG_PREFIX,
    PROFILE_DRAFT_PREFIX,
    PROFILE_VERSIONS_PREFIX,
  ]) {
    for (const key of listKeysWithPrefix(prefix)) {
      const raw = localStorage.getItem(key);
      if (raw && parseJsonSafe(raw) === null) {
        issues.push({
          code: "corrupt_json",
          message: `Corrupt JSON at ${key}`,
          key,
        });
      }
    }
  }

  // Dangling asset refs on active config
  if (reg?.activeId) {
    const raw = localStorage.getItem(
      `${PROFILE_CONFIG_PREFIX}${reg.activeId}`
    );
    if (raw?.includes("asset:h1:")) {
      const re = /asset:h1:[a-z0-9]+/gi;
      const found = raw.match(re) || [];
      for (const ref of new Set(found)) {
        if (resolveAsset(ref) === ref) {
          issues.push({
            code: "dangling_asset_ref",
            message: `Missing blob for ${ref}`,
            key: ref,
          });
        }
      }
    }
  }

  let level: StorageHealthLevel = "ok";
  if (usageRatio >= STORAGE_THRESHOLDS.full) level = "full";
  else if (usageRatio >= STORAGE_THRESHOLDS.critical) level = "critical";
  else if (usageRatio >= STORAGE_THRESHOLDS.warn) level = "warn";

  if (level !== "ok") {
    issues.push({
      code: "quota_pressure",
      message: `localStorage ~${Math.round(usageRatio * 100)}% of estimated quota`,
    });
  }

  let assetBlobCount = 0;
  try {
    const store = JSON.parse(localStorage.getItem(ASSET_STORE_KEY) || "{}") as {
      blobs?: Record<string, string>;
    };
    assetBlobCount = Object.keys(store.blobs || {}).length;
  } catch {
    /* ignore */
  }

  return {
    level,
    usedBytes,
    quotaBytes,
    usageRatio,
    keyCount,
    issues,
    profileCount: reg?.profiles?.length ?? 0,
    assetBlobCount,
    orphanAssetCount,
    orphanKeyCount: dropped.length,
  };
}

function dropOrphanProfileKeysDryRun(): { dropped: string[] } {
  const reg = readRegistrySafe();
  const valid = new Set((reg?.profiles || []).map((p) => p.id));
  const dropped: string[] = [];
  const scan = (prefix: string) => {
    for (const k of listKeysWithPrefix(prefix)) {
      const id = k.slice(prefix.length);
      if (!valid.has(id)) dropped.push(k);
    }
  };
  if (reg) {
    scan(PROFILE_CONFIG_PREFIX);
    scan(PROFILE_DRAFT_PREFIX);
    scan(PROFILE_VERSIONS_PREFIX);
  }
  return { dropped };
}

export type RecoverOptions = {
  /** Active profile — its draft is preserved longer. */
  activeProfileId?: ProfileId | null;
  /** Force deeper pruning even when level is only warn. */
  aggressive?: boolean;
  /** Owner id for multi-tab lock. */
  lockOwner?: string;
};

/**
 * Run progressive recovery until setItem is likely to succeed or nothing left.
 */
export function recoverStorage(options: RecoverOptions = {}): RecoveryResult {
  const owner = options.lockOwner || `tab-${Date.now().toString(36)}`;
  const actions: RecoveryAction[] = [];
  let freedApproxBytes = 0;

  if (!tryAcquireStorageLock(owner)) {
    return {
      ok: false,
      actions: ["none"],
      freedApproxBytes: 0,
      report: diagnoseStorage(),
    };
  }

  try {
    repairRegistryConsistency();

    const before = measureLocalStorageBytes().usedBytes;
    const report0 = diagnoseStorage();
    const needSpace =
      options.aggressive ||
      report0.level === "warn" ||
      report0.level === "critical" ||
      report0.level === "full" ||
      report0.orphanAssetCount > 0 ||
      report0.orphanKeyCount > 0;

    if (!needSpace) {
      return {
        ok: true,
        actions: ["none"],
        freedApproxBytes: 0,
        report: report0,
      };
    }

    // 1) Orphan keys from deleted profiles / tab races
    const orphans = dropOrphanProfileKeys();
    if (orphans.dropped.length) {
      actions.push("drop_orphan_keys");
      freedApproxBytes += orphans.freed;
    }

    // 2) Unreferenced assets
    const assetFreed = gcOrphanAssets();
    if (assetFreed > 0) {
      actions.push("gc_assets");
      freedApproxBytes += assetFreed;
    }

    let report = diagnoseStorage();

    // 3) Prune version history when still pressured
    if (
      report.level === "critical" ||
      report.level === "full" ||
      options.aggressive
    ) {
      const vFreed = pruneOldestVersions(options.aggressive ? 2 : 4);
      if (vFreed > 0) {
        actions.push("prune_versions");
        freedApproxBytes += vFreed;
      }
      report = diagnoseStorage();
    }

    // 4) Drop idle drafts under critical/full
    if (report.level === "critical" || report.level === "full" || options.aggressive) {
      const dFreed = dropIdleDrafts(options.activeProfileId);
      if (dFreed > 0) {
        actions.push("drop_idle_drafts");
        freedApproxBytes += dFreed;
      }
      report = diagnoseStorage();
    }

    // 5) Legacy flat keys if still full
    if (report.level === "full" || options.aggressive) {
      try {
        const leg = localStorage.getItem(LEGACY_CONFIG_KEY);
        if (leg && report.profileCount > 0) {
          // Keep legacy only if it is the only config source — otherwise drop mirror
          const reg = readRegistrySafe();
          if (reg?.activeId) {
            const activeCfg = localStorage.getItem(
              `${PROFILE_CONFIG_PREFIX}${reg.activeId}`
            );
            if (activeCfg) {
              freedApproxBytes += byteLen(LEGACY_CONFIG_KEY) + byteLen(leg);
              localStorage.removeItem(LEGACY_CONFIG_KEY);
              actions.push("trim_legacy");
            }
          }
        }
      } catch {
        /* ignore */
      }
      report = diagnoseStorage();
    }

    const after = measureLocalStorageBytes().usedBytes;
    if (freedApproxBytes === 0 && after < before) {
      freedApproxBytes = before - after;
    }

    return {
      ok: report.level !== "full",
      actions: actions.length ? actions : ["none"],
      freedApproxBytes,
      report,
    };
  } finally {
    releaseStorageLock(owner);
  }
}

/** Run on boot: light consistency + opportunistic GC when warn+. */
export function bootStorageMaintenance(activeProfileId?: ProfileId | null): StorageHealthReport {
  repairRegistryConsistency();
  const report = diagnoseStorage();
  if (
    report.level !== "ok" ||
    report.orphanAssetCount > 0 ||
    report.orphanKeyCount > 0
  ) {
    recoverStorage({
      activeProfileId,
      aggressive: report.level === "full" || report.level === "critical",
      lockOwner: `boot-${Date.now().toString(36)}`,
    });
    return diagnoseStorage();
  }
  return report;
}
