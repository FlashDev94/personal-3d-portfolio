/**
 * Pure helpers for multi-tab draft / applied conflicts.
 * Kept free of draftPersist/versionHistory imports so Node tests avoid the
 * Vite PNG asset graph pulled in by normalizePortfolio defaults.
 */

import type { TPortfolioData } from "../../types/portfolio";
import { portfolioFingerprint } from "./fingerprint";
import type { DraftPersistV1, TabConflict, TabConflictKind } from "./types";

export type ConflictDetectionInput = {
  profileId: string;
  /** Local draft fingerprint (present). */
  localDraftFp: string;
  /** Live applied fingerprint known to this tab. */
  liveFp: string;
  /** Whether the local draft differs from its base / live. */
  isDirty: boolean;
  remoteFp: string;
  kind: TabConflictKind;
  label?: string;
  peerDraft?: TPortfolioData;
  peerDraftUpdatedAt?: number;
  peerBaseFingerprint?: string;
};

/**
 * Decide whether a remote signal should surface a conflict banner.
 * Clean local drafts never conflict — callers should auto-adopt instead.
 */
export function shouldSurfaceConflict(input: ConflictDetectionInput): boolean {
  if (!input.profileId) return false;
  if (!input.isDirty) return false;
  if (!input.remoteFp) return false;
  // Same content as local draft — nothing to reconcile.
  if (input.remoteFp === input.localDraftFp) return false;
  if (input.kind === "applied") {
    // Live moved under us while we have unsaved work.
    return input.remoteFp !== input.liveFp || input.isDirty;
  }
  // Peer draft differs from ours.
  return true;
}

export function buildTabConflict(
  input: ConflictDetectionInput & { rev?: number; at?: number }
): TabConflict {
  return {
    rev: input.rev ?? Date.now(),
    at: input.at ?? Date.now(),
    kind: input.kind,
    profileId: input.profileId,
    label: input.label,
    fingerprint: input.remoteFp,
    peerDraft: input.peerDraft,
    peerDraftUpdatedAt: input.peerDraftUpdatedAt,
    peerBaseFingerprint: input.peerBaseFingerprint,
  };
}

/**
 * Build a draft conflict from an already-loaded peer draft payload.
 * Callers load via loadPersistedDraft (browser) so Node tests stay pure.
 */
export function conflictFromPeerDraft(options: {
  profileId: string;
  localDraftFp: string;
  liveFp: string;
  isDirty: boolean;
  peer: DraftPersistV1 | null;
  label?: string;
}): TabConflict | null {
  if (!options.peer) return null;
  const remoteFp = portfolioFingerprint(options.peer.data);
  const input: ConflictDetectionInput = {
    profileId: options.profileId,
    localDraftFp: options.localDraftFp,
    liveFp: options.liveFp,
    isDirty: options.isDirty,
    remoteFp,
    kind: "draft",
    label: options.label ?? "Draft changed in another tab",
    peerDraft: options.peer.data,
    peerDraftUpdatedAt: options.peer.updatedAt,
    peerBaseFingerprint: options.peer.baseFingerprint,
  };
  if (!shouldSurfaceConflict(input)) return null;
  return buildTabConflict(input);
}

/** Prefer newer peer draft timestamps when choosing which side to keep. */
export function preferPeerDraft(options: {
  localUpdatedAt?: number;
  peerUpdatedAt?: number;
}): boolean {
  const local = options.localUpdatedAt ?? 0;
  const peer = options.peerUpdatedAt ?? 0;
  return peer > local;
}

/**
 * Label helper for recovery snapshots (actual appendVersion stays in the UI
 * so this module stays free of the defaults → PNG import chain).
 */
export function recoverySnapshotLabel(label?: string): string {
  const stamp = new Date().toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
  return label?.trim() || `Recovered draft (before tab conflict) · ${stamp}`;
}
