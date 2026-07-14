/** Stable profile id (uuid-ish). */
export type ProfileId = string;

/** URL-safe slug used in shareable preview links (`?profile=frontend`). */
export type ProfileSlug = string;

export type PortfolioProfile = {
  id: ProfileId;
  slug: ProfileSlug;
  label: string;
  createdAt: number;
  updatedAt: number;
};

export type ProfileRegistryV1 = {
  v: 1;
  activeId: ProfileId;
  profiles: PortfolioProfile[];
};

/** Content-addressed asset blobs (shared across all profiles). */
export type AssetStoreV1 = {
  v: 1;
  /** key: asset:h1:<hash> → data URL or remote URL payload */
  blobs: Record<string, string>;
};

export const PROFILE_REGISTRY_KEY = "portfolio-profiles-v1";
export const ASSET_STORE_KEY = "portfolio-assets-v1";

/** Prefix for per-profile applied config. */
export const PROFILE_CONFIG_PREFIX = "portfolio-config-v1:";
/** Prefix for per-profile version history. */
export const PROFILE_VERSIONS_PREFIX = "portfolio-versions-v1:";
/** Prefix for per-profile unsaved draft. */
export const PROFILE_DRAFT_PREFIX = "portfolio-draft-v1:";

/** Built-in specialty templates offered on first migrate / create. */
export const PROFILE_TEMPLATES = [
  {
    slug: "frontend",
    label: "Frontend",
    heroTag: "I craft polished, accessible",
    heroTag2: "frontend product experiences",
    palette: "neon" as const,
  },
  {
    slug: "backend",
    label: "Backend",
    heroTag: "I design reliable APIs and",
    heroTag2: "scalable backend systems",
    palette: "minimal" as const,
  },
  {
    slug: "ad-specialist",
    label: "Ad Specialist",
    heroTag: "I build conversion-focused",
    heroTag2: "campaigns and landing systems",
    palette: "warm" as const,
  },
] as const;

export function profileConfigKey(profileId: ProfileId): string {
  return `${PROFILE_CONFIG_PREFIX}${profileId}`;
}

export function profileVersionsKey(profileId: ProfileId): string {
  return `${PROFILE_VERSIONS_PREFIX}${profileId}`;
}

export function profileDraftKey(profileId: ProfileId): string {
  return `${PROFILE_DRAFT_PREFIX}${profileId}`;
}

export function slugifyLabel(label: string): string {
  const s = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return s || "profile";
}
