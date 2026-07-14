import type { TPortfolioData } from "../../types/portfolio";
import { defaultPortfolioData, STORAGE_KEY } from "../../constants/defaults";
import { clampTheme3d } from "../../constants/theme3d";
import {
  clonePortfolio,
  normalizePortfolio,
  parsePortfolioJson,
} from "../history/clone";
import {
  internPortfolioAssets,
  resolvePortfolioAssets,
} from "./assets";
import {
  PROFILE_REGISTRY_KEY,
  PROFILE_TEMPLATES,
  type PortfolioProfile,
  type ProfileId,
  type ProfileRegistryV1,
  profileConfigKey,
  profileDraftKey,
  profileVersionsKey,
  slugifyLabel,
} from "./types";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `prof-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function uniqueSlug(base: string, profiles: PortfolioProfile[], exceptId?: string): string {
  let slug = slugifyLabel(base);
  const taken = new Set(
    profiles.filter((p) => p.id !== exceptId).map((p) => p.slug)
  );
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

export function readRegistry(): ProfileRegistryV1 | null {
  try {
    const raw = localStorage.getItem(PROFILE_REGISTRY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileRegistryV1;
    if (parsed?.v !== 1 || !Array.isArray(parsed.profiles) || !parsed.activeId) {
      return null;
    }
    const profiles = parsed.profiles.filter(
      (p) => p && p.id && p.slug && p.label
    );
    if (!profiles.length) return null;
    const activeId = profiles.some((p) => p.id === parsed.activeId)
      ? parsed.activeId
      : profiles[0].id;
    return { v: 1, activeId, profiles };
  } catch {
    return null;
  }
}

export function writeRegistry(registry: ProfileRegistryV1): boolean {
  try {
    localStorage.setItem(PROFILE_REGISTRY_KEY, JSON.stringify(registry));
    return true;
  } catch (err) {
    console.warn("Failed to persist profile registry", err);
    return false;
  }
}

/** Load applied portfolio for a profile (resolved assets for display). */
export function loadProfileData(profileId: ProfileId): TPortfolioData | null {
  try {
    const raw = localStorage.getItem(profileConfigKey(profileId));
    const parsed = parsePortfolioJson(raw);
    if (!parsed) return null;
    return resolvePortfolioAssets(parsed);
  } catch {
    return null;
  }
}

/**
 * Persist applied portfolio for a profile.
 * Interns heavy icons into the shared asset store first.
 */
export function saveProfileData(
  profileId: ProfileId,
  data: TPortfolioData
): boolean {
  try {
    const interned = internPortfolioAssets(data);
    localStorage.setItem(
      profileConfigKey(profileId),
      JSON.stringify(interned)
    );
    // Keep legacy key in sync for the active profile (back-compat tools)
    const reg = readRegistry();
    if (reg?.activeId === profileId) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(interned));
      } catch {
        /* non-fatal */
      }
    }
    return true;
  } catch (err) {
    console.warn("Failed to save profile data", err);
    return false;
  }
}

export function deleteProfileStorage(profileId: ProfileId): void {
  try {
    localStorage.removeItem(profileConfigKey(profileId));
    localStorage.removeItem(profileVersionsKey(profileId));
    localStorage.removeItem(profileDraftKey(profileId));
  } catch {
    /* ignore */
  }
}

function templateData(
  template: (typeof PROFILE_TEMPLATES)[number]
): TPortfolioData {
  const base = clonePortfolio(defaultPortfolioData);
  base.config.hero.p = [template.heroTag, template.heroTag2];
  base.config.html.title = `${base.config.html.fullName} — ${template.label}`;
  base.config.sections.about.h2 = `${template.label}.`;
  base.theme3d = clampTheme3d({
    ...base.theme3d,
    palette: template.palette,
  });
  return base;
}

/**
 * Ensure a profile registry exists. Migrates legacy single-portfolio storage
 * and seeds specialty profiles (frontend / backend / ad-specialist).
 */
export function ensureProfileRegistry(): ProfileRegistryV1 {
  const existing = readRegistry();
  if (existing) return existing;

  const now = Date.now();
  const profiles: PortfolioProfile[] = [];

  // Migrate legacy flat config if present
  const legacy = parsePortfolioJson(localStorage.getItem(STORAGE_KEY));
  const defaultId = newId();
  profiles.push({
    id: defaultId,
    slug: "full-stack",
    label: "Full stack",
    createdAt: now,
    updatedAt: now,
  });
  saveProfileData(defaultId, legacy ?? defaultPortfolioData);

  // Migrate legacy versions/draft into default profile keys
  try {
    const legacyVersions = localStorage.getItem("portfolio-versions-v1");
    if (legacyVersions) {
      localStorage.setItem(profileVersionsKey(defaultId), legacyVersions);
    }
    const legacyDraft = localStorage.getItem("portfolio-draft-v1");
    if (legacyDraft) {
      localStorage.setItem(profileDraftKey(defaultId), legacyDraft);
    }
  } catch {
    /* ignore */
  }

  for (const t of PROFILE_TEMPLATES) {
    const id = newId();
    profiles.push({
      id,
      slug: t.slug,
      label: t.label,
      createdAt: now,
      updatedAt: now,
    });
    // Templates share default asset URLs (bundled paths) — no blob duplication
    saveProfileData(id, templateData(t));
  }

  const registry: ProfileRegistryV1 = {
    v: 1,
    activeId: defaultId,
    profiles,
  };
  writeRegistry(registry);
  return registry;
}

export function getProfile(
  registry: ProfileRegistryV1,
  id: ProfileId
): PortfolioProfile | null {
  return registry.profiles.find((p) => p.id === id) ?? null;
}

export function getProfileBySlug(
  registry: ProfileRegistryV1,
  slug: string
): PortfolioProfile | null {
  const s = slug.trim().toLowerCase();
  return registry.profiles.find((p) => p.slug === s) ?? null;
}

export function createProfile(
  label: string,
  options?: { cloneFromId?: ProfileId; slug?: string }
): { registry: ProfileRegistryV1; profile: PortfolioProfile } {
  const registry = ensureProfileRegistry();
  const now = Date.now();
  const id = newId();
  const slug = uniqueSlug(options?.slug || label, registry.profiles);
  const profile: PortfolioProfile = {
    id,
    slug,
    label: label.trim() || "New profile",
    createdAt: now,
    updatedAt: now,
  };

  let data: TPortfolioData = clonePortfolio(defaultPortfolioData);
  if (options?.cloneFromId) {
    data = loadProfileData(options.cloneFromId) ?? data;
  }
  saveProfileData(id, data);

  registry.profiles = [...registry.profiles, profile];
  writeRegistry(registry);
  return { registry: readRegistry() ?? registry, profile };
}

export function renameProfile(
  profileId: ProfileId,
  label: string
): ProfileRegistryV1 {
  const registry = ensureProfileRegistry();
  const nextLabel = label.trim() || "Profile";
  registry.profiles = registry.profiles.map((p) =>
    p.id === profileId
      ? {
          ...p,
          label: nextLabel,
          slug: uniqueSlug(nextLabel, registry.profiles, profileId),
          updatedAt: Date.now(),
        }
      : p
  );
  writeRegistry(registry);
  return readRegistry() ?? registry;
}

export function setActiveProfileId(profileId: ProfileId): ProfileRegistryV1 {
  const registry = ensureProfileRegistry();
  if (!registry.profiles.some((p) => p.id === profileId)) return registry;
  registry.activeId = profileId;
  writeRegistry(registry);
  // Mirror active config to legacy key
  const data = loadProfileData(profileId);
  if (data) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(internPortfolioAssets(data))
      );
    } catch {
      /* ignore */
    }
  }
  return readRegistry() ?? registry;
}

/**
 * Delete a profile. Refuses to delete the last remaining profile.
 * Does not purge shared assets (may still be referenced by others).
 */
export function deleteProfile(profileId: ProfileId): ProfileRegistryV1 {
  const registry = ensureProfileRegistry();
  if (registry.profiles.length <= 1) return registry;
  registry.profiles = registry.profiles.filter((p) => p.id !== profileId);
  if (registry.activeId === profileId) {
    registry.activeId = registry.profiles[0].id;
  }
  deleteProfileStorage(profileId);
  writeRegistry(registry);
  return readRegistry() ?? registry;
}

export function touchProfile(profileId: ProfileId): void {
  const registry = readRegistry();
  if (!registry) return;
  registry.profiles = registry.profiles.map((p) =>
    p.id === profileId ? { ...p, updatedAt: Date.now() } : p
  );
  writeRegistry(registry);
}
