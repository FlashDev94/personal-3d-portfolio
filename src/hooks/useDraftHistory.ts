import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { TPortfolioData } from "../types/portfolio";
import {
  HISTORY_LIMITS,
  clonePortfolio,
  portfolioFingerprint,
  savePersistedDraft,
  clearPersistedDraft,
  type DraftCommitOptions,
} from "../utils/history";

export type UseDraftHistoryResult = {
  draft: TPortfolioData;
  setDraft: (
    action: SetStateAction<TPortfolioData>,
    options?: DraftCommitOptions
  ) => void;
  /** Replace draft and reset undo stacks (open panel / discard / load live). */
  resetDraft: (
    next: TPortfolioData,
    options?: { baseFingerprint?: string }
  ) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  isDirty: boolean;
  markClean: (fingerprint?: string) => void;
  flushHistory: () => void;
  clearDraftPersistence: () => void;
};

type StackEntry = {
  data: TPortfolioData;
  label: string;
  at: number;
};

function resolveAction(
  action: SetStateAction<TPortfolioData>,
  prev: TPortfolioData
): TPortfolioData {
  return typeof action === "function"
    ? (action as (p: TPortfolioData) => TPortfolioData)(prev)
    : action;
}

/**
 * Configurator draft with debounced undo coalescing for typing and
 * immediate checkpoints for structural ops (resume, icons, theme, …).
 *
 * Performance notes:
 * - Present state is NOT deep-cloned on every keystroke (callers return new objects).
 * - Snapshots for undo/redo/persist are cloned only when committing a history step.
 * - Fingerprints avoid hashing full base64 icon payloads.
 */
export function useDraftHistory(
  initial: TPortfolioData,
  liveFingerprint: string
): UseDraftHistoryResult {
  const [draft, setDraftState] = useState<TPortfolioData>(() =>
    clonePortfolio(initial)
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [undoLabel, setUndoLabel] = useState<string | null>(null);
  const [redoLabel, setRedoLabel] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(
    () => portfolioFingerprint(initial) !== liveFingerprint
  );

  const presentRef = useRef(draft);
  const pastRef = useRef<StackEntry[]>([]);
  const futureRef = useRef<StackEntry[]>([]);
  const baseFpRef = useRef(liveFingerprint || portfolioFingerprint(initial));

  /** Start-of-burst snapshot for debounced typing. */
  const burstBaseRef = useRef<StackEntry | null>(null);
  const debounceTimerRef = useRef<number | null>(null);
  const persistTimerRef = useRef<number | null>(null);

  const syncFlags = useCallback(() => {
    const past = pastRef.current;
    const future = futureRef.current;
    setCanUndo(past.length > 0);
    setCanRedo(future.length > 0);
    setUndoLabel(past.length ? past[past.length - 1].label : null);
    setRedoLabel(future.length ? future[0].label : null);
    setIsDirty(portfolioFingerprint(presentRef.current) !== baseFpRef.current);
  }, []);

  /** Last fingerprint successfully written to draft storage (dedupe thrash). */
  const lastPersistedFpRef = useRef<string | null>(null);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      const fp = portfolioFingerprint(presentRef.current);
      if (fp === baseFpRef.current) {
        lastPersistedFpRef.current = null;
        clearPersistedDraft();
        return;
      }
      // Skip identical re-writes (rapid selective restore / theme thrash).
      if (lastPersistedFpRef.current === fp) return;
      const ok = savePersistedDraft(presentRef.current, baseFpRef.current);
      if (ok) lastPersistedFpRef.current = fp;
    }, HISTORY_LIMITS.draftPersistMs);
  }, []);

  const pushPast = useCallback((entry: StackEntry) => {
    pastRef.current = [...pastRef.current, entry].slice(
      -HISTORY_LIMITS.maxUndo
    );
    futureRef.current = [];
  }, []);

  const flushDebouncedHistory = useCallback(() => {
    if (debounceTimerRef.current != null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const base = burstBaseRef.current;
    burstBaseRef.current = null;
    if (!base) return;
    const currentFp = portfolioFingerprint(presentRef.current);
    const baseFp = portfolioFingerprint(base.data);
    if (currentFp === baseFp) return;
    pushPast(base);
  }, [pushPast]);

  const setDraft = useCallback(
    (action: SetStateAction<TPortfolioData>, options?: DraftCommitOptions) => {
      const skipHistory = options?.skipHistory === true;
      const immediate = options?.immediate === true;
      const label = options?.label?.trim() || "Edit";

      if (!skipHistory && immediate) {
        flushDebouncedHistory();
      }

      const prev = presentRef.current;
      const next = resolveAction(action, prev);
      presentRef.current = next;
      setDraftState(next);

      if (skipHistory) {
        schedulePersist();
        syncFlags();
        return;
      }

      if (immediate) {
        const prevFp = portfolioFingerprint(prev);
        const nextFp = portfolioFingerprint(next);
        if (prevFp !== nextFp) {
          pushPast({
            data: clonePortfolio(prev),
            label,
            at: Date.now(),
          });
        }
        schedulePersist();
        syncFlags();
        return;
      }

      // Debounced coalesce: first keystroke in a burst captures baseline once
      if (!burstBaseRef.current) {
        burstBaseRef.current = {
          data: clonePortfolio(prev),
          label,
          at: Date.now(),
        };
      } else if (label && label !== "Edit") {
        burstBaseRef.current.label = label;
      }

      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        flushDebouncedHistory();
        schedulePersist();
        syncFlags();
      }, HISTORY_LIMITS.draftDebounceMs);

      // Responsive dirty flag while typing (full fingerprint on idle via syncFlags)
      setIsDirty(true);
      schedulePersist();
    },
    [flushDebouncedHistory, pushPast, schedulePersist, syncFlags]
  );

  const undo = useCallback(() => {
    flushDebouncedHistory();
    const past = pastRef.current;
    if (!past.length) return false;
    const entry = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [
      {
        data: clonePortfolio(presentRef.current),
        label: entry.label,
        at: Date.now(),
      },
      ...futureRef.current,
    ].slice(0, HISTORY_LIMITS.maxUndo);
    const restored = clonePortfolio(entry.data);
    presentRef.current = restored;
    setDraftState(restored);
    schedulePersist();
    syncFlags();
    return true;
  }, [flushDebouncedHistory, schedulePersist, syncFlags]);

  const redo = useCallback(() => {
    flushDebouncedHistory();
    const future = futureRef.current;
    if (!future.length) return false;
    const entry = future[0];
    futureRef.current = future.slice(1);
    pastRef.current = [
      ...pastRef.current,
      {
        data: clonePortfolio(presentRef.current),
        label: entry.label,
        at: Date.now(),
      },
    ].slice(-HISTORY_LIMITS.maxUndo);
    const restored = clonePortfolio(entry.data);
    presentRef.current = restored;
    setDraftState(restored);
    schedulePersist();
    syncFlags();
    return true;
  }, [flushDebouncedHistory, schedulePersist, syncFlags]);

  const resetDraft = useCallback(
    (next: TPortfolioData, options?: { baseFingerprint?: string }) => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      burstBaseRef.current = null;
      pastRef.current = [];
      futureRef.current = [];
      const cloned = clonePortfolio(next);
      presentRef.current = cloned;
      setDraftState(cloned);
      baseFpRef.current =
        options?.baseFingerprint != null
          ? options.baseFingerprint
          : portfolioFingerprint(cloned);
      clearPersistedDraft();
      syncFlags();
    },
    [syncFlags]
  );

  const markClean = useCallback(
    (fingerprint?: string) => {
      baseFpRef.current =
        fingerprint ?? portfolioFingerprint(presentRef.current);
      clearPersistedDraft();
      syncFlags();
    },
    [syncFlags]
  );

  const clearDraftPersistence = useCallback(() => {
    clearPersistedDraft();
  }, []);

  const flushHistory = useCallback(() => {
    flushDebouncedHistory();
    syncFlags();
  }, [flushDebouncedHistory, syncFlags]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current != null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      if (persistTimerRef.current != null) {
        window.clearTimeout(persistTimerRef.current);
      }
      const fp = portfolioFingerprint(presentRef.current);
      if (fp !== baseFpRef.current) {
        savePersistedDraft(presentRef.current, baseFpRef.current);
      }
    };
  }, []);

  return {
    draft,
    setDraft,
    resetDraft,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    isDirty,
    markClean,
    flushHistory,
    clearDraftPersistence,
  };
}
