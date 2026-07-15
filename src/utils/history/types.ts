import type { TPortfolioData } from "../../types/portfolio";

/** Persisted applied snapshot (version history). */
export type VersionEntry = {
  id: string;
  at: number;
  label: string;
  data: TPortfolioData;
};

export type VersionStoreV1 = {
  v: 1;
  entries: VersionEntry[];
};

/** Unsaved configurator draft (present only — undo stacks stay in memory). */
export type DraftPersistV1 = {
  v: 1;
  updatedAt: number;
  /** Fingerprint of live applied data when this draft was last aligned. */
  baseFingerprint: string;
  data: TPortfolioData;
};

export type DraftCommitOptions = {
  /**
   * Push onto the undo stack immediately (resume, import, structural edits,
   * icon uploads, theme presets). Default false = coalesce typing into one step.
   */
  immediate?: boolean;
  /** Human label for the undo step / version entry. */
  label?: string;
  /** Update present without recording history (undo/redo internals, remote seed). */
  skipHistory?: boolean;
};

export type SyncMessage =
  | {
      type: "applied";
      tabId: string;
      rev: number;
      fingerprint: string;
      label?: string;
      /** Profile that was applied (multi-profile). */
      profileId?: string;
    }
  | {
      type: "versions";
      tabId: string;
      rev: number;
      profileId?: string;
    }
  | {
      type: "profile-switch";
      tabId: string;
      rev: number;
      profileId: string;
    }
  | {
      type: "profiles";
      tabId: string;
      rev: number;
    }
  | {
      /** Peer tab persisted an unsaved draft for a profile. */
      type: "draft";
      tabId: string;
      rev: number;
      profileId: string;
      fingerprint: string;
      updatedAt: number;
      baseFingerprint?: string;
    }
  | {
      /** Another tab reclaimed storage / repaired consistency. */
      type: "storage-health";
      tabId: string;
      rev: number;
      level?: string;
    };

/**
 * Cross-tab conflict on the active profile: peer applied live changes and/or
 * overwrote the shared draft key while this tab still has local edits.
 */
export type TabConflictKind = "applied" | "draft";

export type TabConflict = {
  rev: number;
  at: number;
  kind: TabConflictKind;
  profileId: string;
  label?: string;
  /** Fingerprint of the remote side (live applied or peer draft). */
  fingerprint: string;
  /** Peer draft payload when kind === "draft" (resolved icons). */
  peerDraft?: TPortfolioData;
  peerDraftUpdatedAt?: number;
  peerBaseFingerprint?: string;
};

export const HISTORY_LIMITS = {
  maxUndo: 40,
  maxVersions: 20,
  draftDebounceMs: 400,
  draftPersistMs: 350,
  /** Soft cap before we warn / prune (bytes of JSON). */
  maxSnapshotChars: 4_500_000,
} as const;

export const DRAFT_STORAGE_KEY = "portfolio-draft-v1";
export const VERSIONS_STORAGE_KEY = "portfolio-versions-v1";
export const SYNC_CHANNEL_NAME = "portfolio-sync-v1";
export const TAB_ID_KEY = "portfolio-tab-id";
