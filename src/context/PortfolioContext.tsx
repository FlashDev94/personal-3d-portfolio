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
  setVersionHistoryProfileId,
  subscribePortfolioSync,
  type VersionEntry,
} from "../utils/history";
import {
  createProfile as createProfileInStore,
  deleteProfile as deleteProfileInStore,
  ensureProfileRegistry,
  getProfileBySlug,
  loadProfileData,
  type PortfolioProfile,
  type ProfileId,
  profileConfigKey,
  profileVersionsKey,
  renameProfile as renameProfileInStore,
  saveProfileData,
  setActiveProfileId,
  touchProfile,
  writeRegistry,
} from "../utils/profiles";
import {
  bootStorageMaintenance,
  diagnoseStorage,
  recoverStorage,
  type StorageHealthReport,
} from "../utils/storage";

/** Portfolio payload without the live theme (theme has its own context). */
export type TPortfolioContent = Omit<TPortfolioData, "theme3d">;

/** Peer tab applied a new live portfolio for the active profile. */
export type RemoteUpdateNotice = {
  rev: number;
  at: number;
  label?: string;
  fingerprint: string;
  profileId?: string;
};

type ContentContextValue = {
  content: TPortfolioContent;
  data: TPortfolioData;
  setData: React.Dispatch<React.SetStateAction<TPortfolioData>>;
  updateData: (partial: Partial<TPortfolioData>) => void;
  replaceData: (next: TPortfolioData) => void;
  commitPortfolio: (next: TPortfolioData, label: string) => boolean;
  resetToDefaults: () => void;
  exportJson: () => string;
  importJson: (json: string, label?: string) => void;
  isHydrated: boolean;
  liveFingerprint: string;
  remoteUpdate: RemoteUpdateNotice | null;
  acknowledgeRemoteUpdate: () => void;
  versions: VersionEntry[];
  refreshVersions: () => void;
  restoreVersion: (id: string) => boolean;
  deleteVersion: (id: string) => void;
  /** Multi-profile */
  profiles: PortfolioProfile[];
  activeProfileId: ProfileId;
  activeProfile: PortfolioProfile | null;
  /** True when URL is in shareable preview mode (no accidental admin side-effects). */
  isPreviewMode: boolean;
  switchProfile: (profileId: ProfileId, opts?: { preview?: boolean }) => void;
  createProfile: (
    label: string,
    opts?: { cloneFromActive?: boolean }
  ) => PortfolioProfile | null;
  renameProfile: (profileId: ProfileId, label: string) => void;
  deleteProfile: (profileId: ProfileId) => boolean;
  /** Shareable link for the given profile slug (current origin). */
  getShareUrl: (slug: string, preview?: boolean) => string;
  refreshProfiles: () => void;
  /** localStorage health (quota, orphans, consistency). */
  storageHealth: StorageHealthReport | null;
  refreshStorageHealth: () => StorageHealthReport;
  /** Reclaim space / repair orphans; returns updated health. */
  recoverBrowserStorage: (aggressive?: boolean) => StorageHealthReport;
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

function readUrlProfile(): { slug: string | null; preview: boolean } {
  if (typeof window === "undefined") return { slug: null, preview: false };
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      slug: params.get("profile") || params.get("p"),
      preview:
        params.get("preview") === "1" || params.get("preview") === "true",
    };
  } catch {
    return { slug: null, preview: false };
  }
}

function writeUrlProfile(slug: string, preview: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("profile", slug);
    if (preview) url.searchParams.set("preview", "1");
    else url.searchParams.delete("preview");
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* ignore */
  }
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
  const [profiles, setProfiles] = useState<PortfolioProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<ProfileId>("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [storageHealth, setStorageHealth] =
    useState<StorageHealthReport | null>(null);

  const contentRef = useRef(content);
  const themeRef = useRef(theme3d);
  contentRef.current = content;
  themeRef.current = theme3d;

  const applyingRemoteRef = useRef(false);
  const liveFpRef = useRef(liveFingerprint);
  const activeProfileIdRef = useRef(activeProfileId);
  activeProfileIdRef.current = activeProfileId;
  const isPreviewModeRef = useRef(isPreviewMode);
  isPreviewModeRef.current = isPreviewMode;

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

  const refreshProfiles = useCallback(() => {
    const reg = ensureProfileRegistry();
    setProfiles(reg.profiles);
    setActiveProfileIdState(reg.activeId);
  }, []);

  const applyLocal = useCallback((next: TPortfolioData) => {
    const split = splitPortfolio(next);
    const fp = portfolioFingerprint(next);
    liveFpRef.current = fp;
    setContent(split.content);
    setTheme3d(split.theme3d);
    setLiveFingerprint(fp);
  }, []);

  const loadProfileIntoState = useCallback(
    (profileId: ProfileId, label?: string) => {
      setVersionHistoryProfileId(profileId);
      const data = loadProfileData(profileId) ?? cloneDefault();
      applyLocal(data);
      // Defer version-history parse so profile switches paint content first
      window.setTimeout(() => {
        if (activeProfileIdRef.current !== profileId) return;
        const existing = loadVersionHistory();
        if (existing.length === 0) {
          ensureSeedVersion(data, label || "Profile loaded");
          setVersions(loadVersionHistory());
        } else {
          setVersions(existing);
        }
      }, 0);
    },
    [applyLocal]
  );

  useEffect(() => {
    const reg = ensureProfileRegistry();
    setProfiles(reg.profiles);

    const { slug, preview } = readUrlProfile();
    let profileId = reg.activeId;
    if (slug) {
      const bySlug = getProfileBySlug(reg, slug);
      if (bySlug) {
        profileId = bySlug.id;
        if (!preview) {
          setActiveProfileId(profileId);
        }
      }
    }

    // Hydrate first so the boot gate can open; run heavier storage GC idle.
    setActiveProfileIdState(profileId);
    setIsPreviewMode(preview && !!slug);
    setVersionHistoryProfileId(profileId);
    loadProfileIntoState(profileId, "Restored profile");
    const active = reg.profiles.find((p) => p.id === profileId);
    if (active) writeUrlProfile(active.slug, preview && !!slug);
    setIsHydrated(true);

    // Opportunistic consistency + GC after first paint (does not block boot)
    const maintTimer = window.setTimeout(() => {
      try {
        const health = bootStorageMaintenance(profileId);
        setStorageHealth(health);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(maintTimer);
  }, [loadProfileIntoState]);

  const refreshStorageHealth = useCallback(() => {
    const report = diagnoseStorage();
    setStorageHealth(report);
    return report;
  }, []);

  const recoverBrowserStorage = useCallback(
    (aggressive = true) => {
      const result = recoverStorage({
        activeProfileId: activeProfileIdRef.current,
        aggressive,
        lockOwner: `ui-${Date.now().toString(36)}`,
      });
      setStorageHealth(result.report);
      refreshProfiles();
      setVersions(loadVersionHistory());
      broadcastPortfolioSync({
        type: "storage-health",
        rev: Date.now(),
        level: result.report.level,
      });
      return result.report;
    },
    [refreshProfiles]
  );
  // Debounced persist of *active* profile (skip pure preview browsing)
  useEffect(() => {
    if (!isHydrated || !activeProfileId) return;
    if (applyingRemoteRef.current) return;
    if (isPreviewMode) return;
    const handle = window.setTimeout(() => {
      const payload = { ...content, theme3d };
      const ok = saveProfileData(activeProfileId, payload);
      if (!ok) {
        console.warn("Failed to persist profile config");
        return;
      }
      touchProfile(activeProfileId);
      const fp = portfolioFingerprint(payload);
      liveFpRef.current = fp;
      setLiveFingerprint(fp);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [content, theme3d, isHydrated, activeProfileId, isPreviewMode]);

  useEffect(() => {
    if (content.config.html.title) {
      document.title = content.config.html.title;
    }
  }, [content.config.html.title]);

  useEffect(() => {
    applyPaletteToDocument(theme3d);
  }, [theme3d]);

  // Multi-tab sync (profile-aware)
  useEffect(() => {
    if (!isHydrated) return;

    let remoteGateTimer: number | null = null;

    const ingestRemoteForProfile = (
      profileId: string | undefined,
      label?: string
    ) => {
      const pid = profileId || activeProfileIdRef.current;
      if (!pid || pid !== activeProfileIdRef.current) {
        // Another profile changed — refresh registry only; do not clobber this tab's view
        refreshProfiles();
        return;
      }
      const stored = loadProfileData(pid);
      if (!stored) return;
      const fp = portfolioFingerprint(stored);
      if (fp === liveFpRef.current) return;

      applyingRemoteRef.current = true;
      applyLocal(stored);
      setVersionHistoryProfileId(pid);
      setVersions(loadVersionHistory());
      setRemoteUpdate({
        rev: Date.now(),
        at: Date.now(),
        label,
        fingerprint: fp,
        profileId: pid,
      });
      if (remoteGateTimer != null) window.clearTimeout(remoteGateTimer);
      remoteGateTimer = window.setTimeout(() => {
        applyingRemoteRef.current = false;
        remoteGateTimer = null;
      }, 250);
    };

    const unsub = subscribePortfolioSync((msg) => {
      if (!isForeignTab(msg)) return;
      if (msg.type === "applied") {
        ingestRemoteForProfile(msg.profileId, msg.label);
      } else if (msg.type === "versions") {
        if (!msg.profileId || msg.profileId === activeProfileIdRef.current) {
          setVersions(loadVersionHistory());
        }
      } else if (msg.type === "profile-switch") {
        // Peer switched active profile — adopt content + URL so tabs stay aligned.
        // Per-profile drafts flush on configurator unmount, so this is safe.
        refreshProfiles();
        if (msg.profileId && msg.profileId !== activeProfileIdRef.current) {
          const reg = ensureProfileRegistry();
          const profile = reg.profiles.find((p) => p.id === msg.profileId);
          if (profile) {
            setActiveProfileIdState(profile.id);
            setIsPreviewMode(false);
            setVersionHistoryProfileId(profile.id);
            writeUrlProfile(profile.slug, false);
            loadProfileIntoState(
              profile.id,
              `Switched in another tab to ${profile.label}`
            );
            setRemoteUpdate(null);
          }
        }
      } else if (msg.type === "profiles") {
        refreshProfiles();
      } else if (msg.type === "storage-health") {
        refreshProfiles();
        setVersions(loadVersionHistory());
        setStorageHealth(diagnoseStorage());
      }
      // "draft" messages are handled in the configurator (needs isDirty / local draft)
    });

    const onStorage = (ev: StorageEvent) => {
      if (ev.storageArea !== localStorage) return;
      const pid = activeProfileIdRef.current;
      if (ev.key === profileConfigKey(pid) && ev.newValue) {
        ingestRemoteForProfile(pid, "Updated in another tab");
      }
      if (ev.key === STORAGE_KEY && ev.newValue) {
        // Legacy mirror of active profile
        ingestRemoteForProfile(pid, "Updated in another tab");
      }
      if (ev.key === profileVersionsKey(pid)) {
        setVersions(loadVersionHistory());
      }
      if (ev.key === "portfolio-profiles-v1") {
        refreshProfiles();
      }
    };
    window.addEventListener("storage", onStorage);

    const onPopState = () => {
      const { slug, preview } = readUrlProfile();
      if (!slug) return;
      const reg = ensureProfileRegistry();
      const bySlug = getProfileBySlug(reg, slug);
      if (!bySlug) return;
      if (bySlug.id === activeProfileIdRef.current && preview === isPreviewModeRef.current) {
        return;
      }
      // Navigate via URL (back/forward)
      setIsPreviewMode(preview);
      if (!preview) setActiveProfileId(bySlug.id);
      setActiveProfileIdState(bySlug.id);
      loadProfileIntoState(bySlug.id, `URL profile: ${bySlug.label}`);
      setRemoteUpdate(null);
    };
    window.addEventListener("popstate", onPopState);

    return () => {
      unsub();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("popstate", onPopState);
      if (remoteGateTimer != null) window.clearTimeout(remoteGateTimer);
      applyingRemoteRef.current = false;
    };
  }, [isHydrated, applyLocal, loadProfileIntoState, refreshProfiles]);

  /** Coalesce rapid navbar switches — only the last profile fully loads. */
  const switchLoadTimerRef = useRef<number | null>(null);
  const pendingSwitchRef = useRef<{
    profileId: ProfileId;
    preview: boolean;
    label: string;
    slug: string;
  } | null>(null);

  const switchProfile = useCallback(
    (profileId: ProfileId, opts?: { preview?: boolean }) => {
      const reg = ensureProfileRegistry();
      const profile = reg.profiles.find((p) => p.id === profileId);
      if (!profile) return;

      const preview = opts?.preview === true;
      // Live data for the outgoing profile is already debounced-persisted.
      // Drafts live in per-profile keys and are NOT touched here.

      // Optimistic UI + URL so the switcher feels instant
      if (!preview) {
        setActiveProfileId(profileId);
      }
      setActiveProfileIdState(profileId);
      setIsPreviewMode(preview);
      setRemoteUpdate(null);
      writeUrlProfile(profile.slug, preview);
      setVersionHistoryProfileId(profileId);

      pendingSwitchRef.current = {
        profileId,
        preview,
        label: profile.label,
        slug: profile.slug,
      };

      if (switchLoadTimerRef.current != null) {
        window.clearTimeout(switchLoadTimerRef.current);
      }
      // ~50ms coalesce: thrashing the select only pays for the final profile
      switchLoadTimerRef.current = window.setTimeout(() => {
        switchLoadTimerRef.current = null;
        const pending = pendingSwitchRef.current;
        if (!pending) return;
        if (pending.profileId !== activeProfileIdRef.current) return;
        loadProfileIntoState(
          pending.profileId,
          `Switched to ${pending.label}`
        );
        broadcastPortfolioSync({
          type: "profile-switch",
          rev: Date.now(),
          profileId: pending.profileId,
        });
      }, 50);
    },
    [loadProfileIntoState]
  );

  const createProfile = useCallback(
    (label: string, opts?: { cloneFromActive?: boolean }) => {
      if (isPreviewModeRef.current) return null;
      const { profile, registry } = createProfileInStore(label, {
        cloneFromId: opts?.cloneFromActive
          ? activeProfileIdRef.current
          : undefined,
      });
      setProfiles(registry.profiles);
      broadcastPortfolioSync({ type: "profiles", rev: Date.now() });
      switchProfile(profile.id);
      return profile;
    },
    [switchProfile]
  );

  const renameProfile = useCallback((profileId: ProfileId, label: string) => {
    const reg = renameProfileInStore(profileId, label);
    setProfiles(reg.profiles);
    const p = reg.profiles.find((x) => x.id === profileId);
    if (p && profileId === activeProfileIdRef.current) {
      writeUrlProfile(p.slug, isPreviewModeRef.current);
    }
    broadcastPortfolioSync({ type: "profiles", rev: Date.now() });
  }, []);

  const deleteProfile = useCallback(
    (profileId: ProfileId) => {
      const reg = ensureProfileRegistry();
      if (reg.profiles.length <= 1) return false;
      const next = deleteProfileInStore(profileId);
      setProfiles(next.profiles);
      broadcastPortfolioSync({ type: "profiles", rev: Date.now() });
      if (profileId === activeProfileIdRef.current) {
        switchProfile(next.activeId);
      }
      return true;
    },
    [switchProfile]
  );

  const getShareUrl = useCallback((slug: string, preview = true) => {
    if (typeof window === "undefined") return `?profile=${slug}&preview=1`;
    const url = new URL(window.location.href);
    url.searchParams.set("profile", slug);
    if (preview) url.searchParams.set("preview", "1");
    else url.searchParams.delete("preview");
    return url.toString();
  }, []);

  const updateTheme = useCallback((partial: Partial<TTheme3d>) => {
    if (isPreviewModeRef.current) return;
    setTheme3d((prev) => clampTheme3d({ ...prev, ...partial }));
  }, []);

  const updateData = useCallback((partial: Partial<TPortfolioData>) => {
    if (isPreviewModeRef.current) return;
    if (partial.theme3d) {
      setTheme3d((prev) => clampTheme3d({ ...prev, ...partial.theme3d }));
    }
    const { theme3d: _ignoredTheme, ...rest } = partial;
    void _ignoredTheme;
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
      if (isPreviewModeRef.current) return;
      applyLocal(next);
    },
    [applyLocal]
  );

  const commitPortfolio = useCallback(
    (next: TPortfolioData, label: string) => {
      if (isPreviewModeRef.current) return false;
      const pid = activeProfileIdRef.current;
      const normalized = parsePortfolioJson(JSON.stringify(next)) ?? next;
      applyLocal(normalized);
      setVersionHistoryProfileId(pid);
      const { persisted } = appendVersion(normalized, label);
      if (!persisted) {
        console.warn(
          "Portfolio applied, but version history could not be persisted (storage full)."
        );
      }
      setVersions(loadVersionHistory());
      setRemoteUpdate(null);
      saveProfileData(pid, normalized);
      touchProfile(pid);
      broadcastPortfolioSync({
        type: "applied",
        rev: Date.now(),
        fingerprint: liveFpRef.current,
        label,
        profileId: pid,
      });
      broadcastPortfolioSync({
        type: "versions",
        rev: Date.now(),
        profileId: pid,
      });
      return persisted;
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
    broadcastPortfolioSync({
      type: "versions",
      rev: Date.now(),
      profileId: activeProfileIdRef.current,
    });
  }, []);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId]
  );

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
      profiles,
      activeProfileId,
      activeProfile,
      isPreviewMode,
      switchProfile,
      createProfile,
      renameProfile,
      deleteProfile,
      getShareUrl,
      refreshProfiles,
      storageHealth,
      refreshStorageHealth,
      recoverBrowserStorage,
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
      profiles,
      activeProfileId,
      activeProfile,
      isPreviewMode,
      switchProfile,
      createProfile,
      renameProfile,
      deleteProfile,
      getShareUrl,
      refreshProfiles,
      storageHealth,
      refreshStorageHealth,
      recoverBrowserStorage,
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

function cloneDefault(): TPortfolioData {
  return JSON.parse(JSON.stringify(defaultPortfolioData)) as TPortfolioData;
}

export function usePortfolio() {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return ctx;
}

export function useTheme3d() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme3d must be used within PortfolioProvider");
  }
  return ctx;
}

export function usePortfolioAll() {
  const portfolio = usePortfolio();
  const { theme3d, updateTheme } = useTheme3d();
  const data = useMemo(
    () => ({ ...portfolio.content, theme3d }),
    [portfolio.content, theme3d]
  );
  return { ...portfolio, data, theme3d, updateTheme };
}

export { parsePortfolioJson, clearVersionHistory, writeRegistry };
