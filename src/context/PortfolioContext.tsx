import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TPortfolioData, TTheme3d } from "../types/portfolio";
import { defaultPortfolioData, STORAGE_KEY } from "../constants/defaults";
import { clampTheme3d } from "../constants/theme3d";
import { applyPaletteToDocument } from "../utils/themeRuntime";
import {
  appendVersion,
  broadcastPortfolioSync,
  clearVersionHistory,
  ensureSeedVersion,
  isForeignTab,
  loadVersionHistory,
  parsePortfolioJson,
  portfolioFingerprint,
  deleteVersion as removeVersionEntry,
  subscribePortfolioSync,
  type VersionEntry,
} from "../utils/history";

/** Portfolio payload without the live theme (theme has its own context). */
export type TPortfolioContent = Omit<TPortfolioData, "theme3d">;

export type RemoteUpdateNotice = {
  rev: number;
  at: number;
  label?: string;
  fingerprint: string;
};

type ContentContextValue = {
  content: TPortfolioContent;
  /** Full snapshot including current theme — identity changes only when content changes. */
  data: TPortfolioData;
  setData: React.Dispatch<React.SetStateAction<TPortfolioData>>;
  updateData: (partial: Partial<TPortfolioData>) => void;
  replaceData: (next: TPortfolioData) => void;
  /**
   * Replace live portfolio, append a version-history snapshot, and notify other tabs.
   * Use for Apply / Import / Reset / Restore version.
   */
  commitPortfolio: (next: TPortfolioData, label: string) => void;
  resetToDefaults: () => void;
  exportJson: () => string;
  importJson: (json: string, label?: string) => void;
  isHydrated: boolean;
  /** Fingerprint of the currently applied live portfolio. */
  liveFingerprint: string;
  /** Another tab committed a newer applied config. */
  remoteUpdate: RemoteUpdateNotice | null;
  acknowledgeRemoteUpdate: () => void;
  /** Applied version history (newest last). */
  versions: VersionEntry[];
  refreshVersions: () => void;
  restoreVersion: (id: string) => boolean;
  deleteVersion: (id: string) => void;
};

type ThemeContextValue = {
  theme3d: TTheme3d;
  updateTheme: (partial: Partial<TTheme3d>) => void;
};

const ContentContext = createContext<ContentContextValue | null>(null);
const ThemeContext = createContext<ThemeContextValue | null>(null);

function splitPortfolio(full: TPortfolioData): {
  content: TPortfolioContent;
  theme3d: TTheme3d;
} {
  const { theme3d, ...content } = full;
  return {
    content,
    theme3d: clampTheme3d(theme3d ?? defaultPortfolioData.theme3d),
  };
}

const initial = splitPortfolio(defaultPortfolioData);

export const PortfolioProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [content, setContent] = useState<TPortfolioContent>(initial.content);
  const [theme3d, setTheme3d] = useState<TTheme3d>(initial.theme3d);
  const [isHydrated, setIsHydrated] = useState(false);
  const [liveFingerprint, setLiveFingerprint] = useState(() =>
    portfolioFingerprint(defaultPortfolioData)
  );
  const [remoteUpdate, setRemoteUpdate] = useState<RemoteUpdateNotice | null>(
    null
  );
  const [versions, setVersions] = useState<VersionEntry[]>([]);

  // Always-current refs for export / persistence without widening memo deps
  const contentRef = useRef(content);
  const themeRef = useRef(theme3d);
  contentRef.current = content;
  themeRef.current = theme3d;

  /** Suppress echoing our own localStorage writes as remote updates. */
  const persistEpochRef = useRef(0);
  const applyingRemoteRef = useRef(false);

  const fullData = useCallback(
    (): TPortfolioData => ({
      ...contentRef.current,
      theme3d: themeRef.current,
    }),
    []
  );

  const refreshVersions = useCallback(() => {
    setVersions(loadVersionHistory());
  }, []);

  const applyLocal = useCallback((next: TPortfolioData) => {
    const split = splitPortfolio(next);
    setContent(split.content);
    setTheme3d(split.theme3d);
    setLiveFingerprint(portfolioFingerprint(next));
  }, []);

  useEffect(() => {
    const stored = parsePortfolioJson(localStorage.getItem(STORAGE_KEY));
    if (stored) {
      applyLocal(stored);
      ensureSeedVersion(stored, "Restored from browser");
    } else {
      ensureSeedVersion(defaultPortfolioData, "Initial defaults");
    }
    setVersions(loadVersionHistory());
    setIsHydrated(true);
  }, [applyLocal]);

  // Debounced persist — theme thrashing should not rewrite localStorage every click
  useEffect(() => {
    if (!isHydrated) return;
    if (applyingRemoteRef.current) return;
    const handle = window.setTimeout(() => {
      try {
        const payload = { ...content, theme3d };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        persistEpochRef.current = Date.now();
        setLiveFingerprint(portfolioFingerprint(payload));
      } catch (err) {
        console.warn("Failed to persist portfolio config", err);
      }
    }, 200);
    return () => window.clearTimeout(handle);
  }, [content, theme3d, isHydrated]);

  useEffect(() => {
    if (content.config.html.title) {
      document.title = content.config.html.title;
    }
  }, [content.config.html.title]);

  useEffect(() => {
    applyPaletteToDocument(theme3d);
  }, [theme3d]);

  // Multi-tab: BroadcastChannel + storage event (Safari / older browsers)
  useEffect(() => {
    if (!isHydrated) return;

    const ingestRemote = (label?: string) => {
      const stored = parsePortfolioJson(localStorage.getItem(STORAGE_KEY));
      if (!stored) return;
      const fp = portfolioFingerprint(stored);
      if (fp === portfolioFingerprint(fullData())) return;

      applyingRemoteRef.current = true;
      applyLocal(stored);
      setVersions(loadVersionHistory());
      setRemoteUpdate({
        rev: Date.now(),
        at: Date.now(),
        label,
        fingerprint: fp,
      });
      // Release guard after React applies state + skip one persist cycle
      window.setTimeout(() => {
        applyingRemoteRef.current = false;
      }, 250);
    };

    const unsub = subscribePortfolioSync((msg) => {
      if (!isForeignTab(msg)) return;
      if (msg.type === "applied") {
        ingestRemote(msg.label);
      } else if (msg.type === "versions") {
        setVersions(loadVersionHistory());
      }
    });

    const onStorage = (ev: StorageEvent) => {
      if (ev.storageArea !== localStorage) return;
      if (ev.key === STORAGE_KEY && ev.newValue) {
        // Ignore events that fire in the same document for our writes in some browsers
        ingestRemote("Updated in another tab");
      }
      if (ev.key === "portfolio-versions-v1") {
        setVersions(loadVersionHistory());
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
    };
  }, [isHydrated, applyLocal, fullData]);

  const updateTheme = useCallback((partial: Partial<TTheme3d>) => {
    setTheme3d((prev) => clampTheme3d({ ...prev, ...partial }));
  }, []);

  const updateData = useCallback((partial: Partial<TPortfolioData>) => {
    if (partial.theme3d) {
      setTheme3d((prev) => clampTheme3d({ ...prev, ...partial.theme3d }));
    }
    const { theme3d: _t, ...rest } = partial;
    if (Object.keys(rest).length === 0) return;
    setContent((prev) => {
      const next = { ...prev, ...rest } as TPortfolioContent;
      if (partial.config) {
        next.config = {
          ...prev.config,
          ...partial.config,
          html: { ...prev.config.html, ...partial.config.html },
          hero: { ...prev.config.hero, ...partial.config.hero },
          contact: {
            ...prev.config.contact,
            ...partial.config.contact,
            form: {
              ...prev.config.contact.form,
              ...partial.config.contact?.form,
            },
          },
          sections: {
            ...prev.config.sections,
            ...partial.config.sections,
          },
        };
      }
      return next;
    });
  }, []);

  const replaceData = useCallback(
    (next: TPortfolioData) => {
      applyLocal(next);
    },
    [applyLocal]
  );

  const commitPortfolio = useCallback(
    (next: TPortfolioData, label: string) => {
      const normalized = parsePortfolioJson(JSON.stringify(next)) ?? next;
      applyLocal(normalized);
      appendVersion(normalized, label);
      setVersions(loadVersionHistory());
      const fp = portfolioFingerprint(normalized);
      setLiveFingerprint(fp);
      setRemoteUpdate(null);
      // Persist immediately so other tabs' storage events see fresh data
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        persistEpochRef.current = Date.now();
      } catch (err) {
        console.warn("Failed to persist committed portfolio", err);
      }
      broadcastPortfolioSync({
        type: "applied",
        rev: Date.now(),
        fingerprint: fp,
        label,
      });
      broadcastPortfolioSync({ type: "versions", rev: Date.now() });
    },
    [applyLocal]
  );

  const setData: React.Dispatch<React.SetStateAction<TPortfolioData>> =
    useCallback(
      (action) => {
        const prev = fullData();
        const next = typeof action === "function" ? action(prev) : action;
        replaceData(next);
      },
      [fullData, replaceData]
    );

  const resetToDefaults = useCallback(() => {
    commitPortfolio(defaultPortfolioData, "Reset to defaults");
    try {
      // commitPortfolio already wrote STORAGE_KEY; keep versions
    } catch {
      /* ignore */
    }
  }, [commitPortfolio]);

  const exportJson = useCallback(
    () => JSON.stringify(fullData(), null, 2),
    [fullData]
  );

  const importJson = useCallback(
    (json: string, label = "Imported JSON") => {
      const parsed = parsePortfolioJson(json);
      if (!parsed) throw new Error("Invalid portfolio JSON");
      commitPortfolio(parsed, label);
    },
    [commitPortfolio]
  );

  const acknowledgeRemoteUpdate = useCallback(() => {
    setRemoteUpdate(null);
  }, []);

  const restoreVersion = useCallback(
    (id: string) => {
      const entry = loadVersionHistory().find((v) => v.id === id);
      if (!entry) return false;
      commitPortfolio(entry.data, `Restored: ${entry.label}`);
      return true;
    },
    [commitPortfolio]
  );

  const deleteVersion = useCallback((id: string) => {
    const next = removeVersionEntry(id);
    setVersions(next);
    broadcastPortfolioSync({ type: "versions", rev: Date.now() });
  }, []);

  // Content-facing `data` includes latest theme snapshot but only changes identity
  // when *content* changes — keeps theme toggles from re-rendering content consumers.
  const dataForContent = useMemo<TPortfolioData>(
    () => ({ ...content, theme3d: themeRef.current }),
    [content]
  );

  const contentValue = useMemo<ContentContextValue>(
    () => ({
      content,
      data: dataForContent,
      setData,
      updateData,
      replaceData,
      commitPortfolio,
      resetToDefaults,
      exportJson,
      importJson,
      isHydrated,
      liveFingerprint,
      remoteUpdate,
      acknowledgeRemoteUpdate,
      versions,
      refreshVersions,
      restoreVersion,
      deleteVersion,
    }),
    [
      content,
      dataForContent,
      setData,
      updateData,
      replaceData,
      commitPortfolio,
      resetToDefaults,
      exportJson,
      importJson,
      isHydrated,
      liveFingerprint,
      remoteUpdate,
      acknowledgeRemoteUpdate,
      versions,
      refreshVersions,
      restoreVersion,
      deleteVersion,
    ]
  );

  const themeValue = useMemo<ThemeContextValue>(
    () => ({
      theme3d,
      updateTheme,
    }),
    [theme3d, updateTheme]
  );

  return (
    <ContentContext.Provider value={contentValue}>
      <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>
    </ContentContext.Provider>
  );
};

/** Content + mutators. Does NOT re-render on pure theme3d changes. */
export function usePortfolio() {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return ctx;
}

/** Live 3D / palette theme. Re-renders only when theme3d changes. */
export function useTheme3d() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme3d must be used within PortfolioProvider");
  }
  return ctx;
}

/**
 * Subscribe to both content and theme (e.g. navbar, configurator, shell).
 * Prefer usePortfolio / useTheme3d when only one slice is needed.
 */
export function usePortfolioAll() {
  const portfolio = usePortfolio();
  const { theme3d, updateTheme } = useTheme3d();
  const data = useMemo(
    () => ({ ...portfolio.content, theme3d }),
    [portfolio.content, theme3d]
  );
  return { ...portfolio, data, theme3d, updateTheme };
}

// Re-export for callers that previously relied on context-local parsing
export { parsePortfolioJson, clearVersionHistory };
