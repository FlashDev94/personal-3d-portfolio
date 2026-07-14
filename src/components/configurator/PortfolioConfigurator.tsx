import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConfiguratorTab,
  TPortfolioData,
  TTheme3d,
} from "../../types/portfolio";
import { usePortfolioAll } from "../../context/PortfolioContext";
import {
  parseResumeFile,
  parseResumeFromUrl,
} from "../../utils/resumeParser";
import {
  fileToDataUrl,
  makeInitialsIcon,
  makeProjectPlaceholder,
  resolveCompanyIcon,
  resolveServiceIcon,
  resolveTechIcon,
  TECH_ICON_OPTIONS,
  TAG_COLORS,
} from "../../utils/icons";
import { defaultPortfolioData } from "../../constants/defaults";
import {
  COLOR_MODE_OPTIONS,
  CONTACT_SCENE_OPTIONS,
  HERO_SCENE_OPTIONS,
  PALETTE_OPTIONS,
  clampTheme3d,
  defaultTheme3d,
  resolveThemeTokens,
} from "../../constants/theme3d";
import { useDraftHistory } from "../../hooks/useDraftHistory";
import {
  clonePortfolio,
  loadPersistedDraft,
  parsePortfolioJson,
  portfolioFingerprint,
  type DraftCommitOptions,
} from "../../utils/history";
import { VersionComparePanel } from "./VersionComparePanel";
import { ProfileSwitcher } from "../ProfileSwitcher";

const TABS: { id: ConfiguratorTab; label: string }[] = [
  { id: "upload", label: "Resume Upload" },
  { id: "profiles", label: "Profiles" },
  { id: "profile", label: "Profile" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "testimonials", label: "Testimonials" },
  { id: "theme3d", label: "3D & Theme" },
  { id: "history", label: "History" },
  { id: "data", label: "Import / Export" },
];
const fieldClass =
  "w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2 text-sm text-white outline-none placeholder:text-secondary focus:border-[#915EFF]";
const labelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-secondary";
const sectionCard =
  "rounded-xl border border-white/10 bg-black-100/80 p-4 space-y-3";
const btnPrimary =
  "rounded-xl bg-[#915EFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7d4ee0] disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10";
const btnDanger =
  "rounded-xl border border-red-400/40 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10";

function formatWhen(at: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(at));
  } catch {
    return new Date(at).toLocaleString();
  }
}

function buildInitialDraft(
  live: TPortfolioData,
  profileId?: string | null
): {
  draft: TPortfolioData;
  restored: boolean;
  baseFingerprint: string;
} {
  const liveClamped = {
    ...live,
    theme3d: clampTheme3d(live.theme3d),
  };
  const liveFp = portfolioFingerprint(liveClamped);
  // Load draft for *this* profile only — never another profile's unsaved work.
  const persisted = loadPersistedDraft(profileId);
  if (
    persisted &&
    portfolioFingerprint(persisted.data) !== liveFp
  ) {
    return {
      draft: {
        ...persisted.data,
        theme3d: clampTheme3d(persisted.data.theme3d),
      },
      restored: true,
      baseFingerprint: persisted.baseFingerprint || liveFp,
    };
  }
  return {
    draft: clonePortfolio(liveClamped),
    restored: false,
    baseFingerprint: liveFp,
  };
}

const ConfiguratorPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    data,
    commitPortfolio,
    resetToDefaults,
    exportJson,
    importJson,
    liveFingerprint,
    remoteUpdate,
    acknowledgeRemoteUpdate,
    versions,
    restoreVersion,
    deleteVersion,
    refreshVersions,
    activeProfileId,
    isPreviewMode,
  } = usePortfolioAll();

  // Capture live portfolio only on first mount (panel is remounted per profile
  // via key=activeProfileId) so later live/remote updates do not wipe an
  // in-progress draft via this memo.
  const initialBundle = useMemo(
    () => buildInitialDraft(data, activeProfileId),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional mount-only seed
    []
  );
  const {
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
  } = useDraftHistory(
    initialBundle.draft,
    initialBundle.baseFingerprint,
    activeProfileId
  );

  const [tab, setTab] = useState<ConfiguratorTab>("upload");
  const [status, setStatus] = useState<string | null>(() =>
    initialBundle.restored
      ? "Restored your unsaved draft from a previous session. Review and Apply when ready."
      : null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Structural / heavy edits — one undo step each, available immediately. */
  const commit = useCallback(
    (
      action: React.SetStateAction<TPortfolioData>,
      label: string,
      options?: Omit<DraftCommitOptions, "immediate" | "label">
    ) => {
      setDraft(action, { ...options, immediate: true, label });
    },
    [setDraft]
  );

  const applyDraft = () => {
    flushHistory();
    const snapshot = clonePortfolio(draft);
    const persisted = commitPortfolio(snapshot, "Applied from configurator");
    markClean(portfolioFingerprint(snapshot));
    clearDraftPersistence();
    refreshVersions();
    setStatus(
      persisted
        ? "Portfolio updated, saved, and added to version history."
        : "Portfolio updated and saved. Version history could not be stored (browser storage full)."
    );
    setError(null);
  };

  const discardDraftToLive = () => {
    resetDraft(
      { ...data, theme3d: clampTheme3d(data.theme3d) },
      { baseFingerprint: liveFingerprint }
    );
    acknowledgeRemoteUpdate();
    setStatus("Draft reloaded from the live portfolio.");
    setError(null);
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF resume.");
      return;
    }
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = await parseResumeFile(file);
      commit(
        (prev) => ({
          ...parsed,
          // Keep current 3D theme when filling content from a resume
          theme3d: clampTheme3d(prev.theme3d),
        }),
        `Resume upload: ${file.name}`
      );
      setStatus(
        `Parsed “${file.name}” successfully. Undo restores your previous draft. Review tabs, then Apply.`
      );
      setTab("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse resume.");
    } finally {
      setLoading(false);
    }
  };

  const loadSample = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const parsed = await parseResumeFromUrl("/sample-resume.pdf");
      commit(
        (prev) => ({
          ...parsed,
          theme3d: clampTheme3d(prev.theme3d),
        }),
        "Sample resume loaded"
      );
      setStatus(
        "Sample resume loaded (Pradeep Singh). Undo restores your previous draft. Review tabs and Apply."
      );
      setTab("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sample resume.");
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = <K extends keyof TPortfolioData["config"]>(
    key: K,
    value: TPortfolioData["config"][K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }));
  };

  /** Discrete theme toggles / scene picks — immediate undo step. */
  const updateTheme = <K extends keyof TTheme3d>(
    key: K,
    value: TTheme3d[K],
    options?: { immediate?: boolean }
  ) => {
    const immediate = options?.immediate !== false;
    const apply = (prev: TPortfolioData) => ({
      ...prev,
      theme3d: clampTheme3d({ ...prev.theme3d, [key]: value }),
    });
    if (immediate) {
      commit(apply, `Theme: ${String(key)}`);
    } else {
      setDraft(apply, { label: `Theme: ${String(key)}` });
    }
  };

  const applyPalettePreset = (paletteId: TTheme3d["palette"]) => {
    commit((prev) => {
      const mode = prev.theme3d?.colorMode ?? "dark";
      const tokens = resolveThemeTokens({ palette: paletteId, colorMode: mode });
      return {
        ...prev,
        theme3d: clampTheme3d({
          ...prev.theme3d,
          palette: paletteId,
          starsColor: tokens.starsDefault,
        }),
      };
    }, `Palette: ${paletteId}`);
  };

  const applyColorMode = (colorMode: TTheme3d["colorMode"]) => {
    commit((prev) => {
      const paletteId = prev.theme3d?.palette ?? "violet";
      const tokens = resolveThemeTokens({ palette: paletteId, colorMode });
      return {
        ...prev,
        theme3d: clampTheme3d({
          ...prev.theme3d,
          colorMode,
          starsColor: tokens.starsDefault,
        }),
      };
    }, `Color mode: ${colorMode}`);
  };

  // Keyboard undo/redo while the panel is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Allow Ctrl/Cmd+Z in fields too — that's the expected editor UX
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undo()) setStatus(`Undo: ${undoLabel ?? "previous edit"}`);
        return;
      }
      if (key === "z" && e.shiftKey) {
        e.preventDefault();
        if (redo()) setStatus(`Redo: ${redoLabel ?? "edit"}`);
        return;
      }
      if (key === "y") {
        e.preventDefault();
        if (redo()) setStatus(`Redo: ${redoLabel ?? "edit"}`);
        return;
      }
      // Avoid treating browser shortcuts in non-editable chrome oddly
      void tag;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, undoLabel, redoLabel]);

  // Soft notice when another tab commits — never clobber a dirty draft.
  // Keep remoteUpdate until user reloads or dismisses so the banner cannot
  // disappear after undo-to-clean without reconciling baseFingerprint.
  const remoteRev = remoteUpdate?.rev ?? null;
  useEffect(() => {
    if (!remoteUpdate || remoteRev == null) return;
    if (isDirty) {
      setStatus(
        `Another tab applied “${remoteUpdate.label || "changes"}”. Your draft is preserved — reload from live or keep editing.`
      );
      return;
    }
    // Clean draft: auto-adopt live portfolio from the other tab
    resetDraft(
      { ...data, theme3d: clampTheme3d(data.theme3d) },
      { baseFingerprint: remoteUpdate.fingerprint || liveFingerprint }
    );
    acknowledgeRemoteUpdate();
    setStatus(
      `Synced live portfolio from another tab (${remoteUpdate.label || "update"}).`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remoteRev gates new events; isDirty re-check on clean-up path
  }, [remoteRev, isDirty]);

  return (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close configurator backdrop"
            onClick={onClose}
          />

          <div className="relative flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-primary shadow-2xl sm:h-[85vh] sm:rounded-2xl">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-white">Portfolio Configurator</h2>
                <p className="text-xs text-secondary">
                  Draft edits are undoable and scoped to this profile. Apply saves to this
                  browser, version history, and other open tabs.
                  {isPreviewMode ? (
                    <span className="ml-1 font-semibold text-amber-300">
                      Preview mode — apply disabled
                    </span>
                  ) : remoteUpdate ? (
                    <span className="ml-1 font-semibold text-amber-300">
                      Live site updated in another tab
                    </span>
                  ) : isDirty ? (
                    <span className="ml-1 font-semibold text-amber-300">Unsaved draft</span>
                  ) : (
                    <span className="ml-1 text-emerald-300/90">In sync with live site</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  disabled={!canUndo}
                  title={undoLabel ? `Undo: ${undoLabel} (Ctrl+Z)` : "Nothing to undo"}
                  onClick={() => {
                    if (undo()) setStatus(`Undo: ${undoLabel ?? "previous edit"}`);
                  }}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  disabled={!canRedo}
                  title={redoLabel ? `Redo: ${redoLabel} (Ctrl+Y)` : "Nothing to redo"}
                  onClick={() => {
                    if (redo()) setStatus(`Redo: ${redoLabel ?? "edit"}`);
                  }}
                >
                  Redo
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => setTab("history")}
                >
                  History
                </button>
                <button
                  type="button"
                  className={btnGhost}
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </header>

            {remoteUpdate && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/30 bg-amber-500/10 px-5 py-2 text-sm text-amber-100">
                <span>
                  Live portfolio changed in another tab
                  {remoteUpdate.label ? ` (${remoteUpdate.label})` : ""}.
                  {isDirty
                    ? " Your draft is preserved until you reload or keep editing."
                    : " Draft will sync automatically, or reload now."}
                </span>
                <div className="flex gap-2">
                  <button type="button" className={btnGhost} onClick={discardDraftToLive}>
                    Reload from live
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => acknowledgeRemoteUpdate()}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              <nav className="flex gap-1 overflow-x-auto border-b border-white/10 p-3 md:w-48 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      tab === t.id
                        ? "bg-[#915EFF] text-white"
                        : "text-secondary hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {status && (
                  <div className="mb-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {status}
                  </div>
                )}
                {error && (
                  <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {tab === "profiles" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <ProfileSwitcher variant="panel" />
                    </div>
                  </div>
                )}

                {tab === "upload" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="text-base font-semibold text-white">
                        Upload resume (PDF)
                      </h3>
                      <p className="text-sm text-secondary">
                        We parse name, contact, summary, experience, projects, and skills
                        client-side in your browser. Nothing is uploaded to a server.
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                      />
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className={btnPrimary}
                          disabled={loading}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {loading ? "Parsing…" : "Choose PDF"}
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          disabled={loading}
                          onClick={loadSample}
                        >
                          Load sample resume
                        </button>
                      </div>
                      <p className="text-xs text-secondary">
                        Sample file: <code className="text-white/80">public/sample-resume.pdf</code>{" "}
                        (Pradeep Singh full-stack resume included in this repo).
                      </p>
                    </div>
                    <div className={sectionCard}>
                      <h3 className="text-base font-semibold text-white">How it works</h3>
                      <ol className="list-decimal space-y-1 pl-5 text-sm text-secondary">
                        <li>Upload your PDF or load the sample resume.</li>
                        <li>Review and edit Profile, Experience, Skills, and Projects tabs.</li>
                        <li>Click <strong className="text-white">Apply to portfolio</strong>.</li>
                        <li>Your configuration is saved in browser localStorage.</li>
                      </ol>
                    </div>
                  </div>
                )}

                {tab === "profile" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Identity</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Full name</label>
                          <input
                            className={fieldClass}
                            value={draft.config.html.fullName}
                            onChange={(e) => {
                              const fullName = e.target.value;
                              setDraft((prev) => ({
                                ...prev,
                                config: {
                                  ...prev.config,
                                  html: {
                                    ...prev.config.html,
                                    fullName,
                                    title: `${fullName} — 3D Portfolio`,
                                  },
                                  hero: {
                                    ...prev.config.hero,
                                    name: fullName.split(" ")[0] || fullName,
                                  },
                                },
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Email</label>
                          <input
                            className={fieldClass}
                            value={draft.config.html.email}
                            onChange={(e) =>
                              updateConfig("html", {
                                ...draft.config.html,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Page title</label>
                          <input
                            className={fieldClass}
                            value={draft.config.html.title}
                            onChange={(e) =>
                              updateConfig("html", {
                                ...draft.config.html,
                                title: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Hero first name</label>
                          <input
                            className={fieldClass}
                            value={draft.config.hero.name}
                            onChange={(e) =>
                              updateConfig("hero", {
                                ...draft.config.hero,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Hero taglines</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Line 1</label>
                          <input
                            className={fieldClass}
                            value={draft.config.hero.p[0] || ""}
                            onChange={(e) =>
                              updateConfig("hero", {
                                ...draft.config.hero,
                                p: [e.target.value, draft.config.hero.p[1] || ""],
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Line 2</label>
                          <input
                            className={fieldClass}
                            value={draft.config.hero.p[1] || ""}
                            onChange={(e) =>
                              updateConfig("hero", {
                                ...draft.config.hero,
                                p: [draft.config.hero.p[0] || "", e.target.value],
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Contact meta (optional)</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(
                          [
                            ["phone", "Phone"],
                            ["location", "Location"],
                            ["linkedin", "LinkedIn"],
                            ["github", "GitHub"],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key}>
                            <label className={labelClass}>{label}</label>
                            <input
                              className={fieldClass}
                              value={draft.meta[key] || ""}
                              onChange={(e) =>
                                setDraft((prev) => ({
                                  ...prev,
                                  meta: { ...prev.meta, [key]: e.target.value },
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "about" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">About section</h3>
                      <div>
                        <label className={labelClass}>Eyebrow</label>
                        <input
                          className={fieldClass}
                          value={draft.config.sections.about.p}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                sections: {
                                  ...prev.config.sections,
                                  about: {
                                    ...prev.config.sections.about,
                                    p: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Heading</label>
                        <input
                          className={fieldClass}
                          value={draft.config.sections.about.h2}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                sections: {
                                  ...prev.config.sections,
                                  about: {
                                    ...prev.config.sections.about,
                                    h2: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Overview content</label>
                        <textarea
                          className={`${fieldClass} min-h-[140px]`}
                          value={draft.config.sections.about.content}
                          onChange={(e) =>
                            setDraft((prev) => ({
                              ...prev,
                              config: {
                                ...prev.config,
                                sections: {
                                  ...prev.config.sections,
                                  about: {
                                    ...prev.config.sections.about,
                                    content: e.target.value,
                                  },
                                },
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">Service cards</h3>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() =>
                            commit(
                              (prev) => ({
                                ...prev,
                                services: [
                                  ...prev.services,
                                  {
                                    title: "New Service",
                                    icon: resolveServiceIcon(
                                      "Web Developer",
                                      prev.services.length
                                    ),
                                  },
                                ],
                              }),
                              "Add service"
                            )
                          }
                        >
                          + Add
                        </button>
                      </div>
                      {draft.services.map((service, index) => (
                        <div
                          key={index}
                          className="flex flex-wrap items-end gap-2 rounded-lg border border-white/5 p-3"
                        >
                          <div className="min-w-[200px] flex-1">
                            <label className={labelClass}>Title</label>
                            <input
                              className={fieldClass}
                              value={service.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                setDraft((prev) => {
                                  const services = [...prev.services];
                                  services[index] = {
                                    title,
                                    icon: resolveServiceIcon(title, index),
                                  };
                                  return { ...prev, services };
                                });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              commit(
                                (prev) => ({
                                  ...prev,
                                  services: prev.services.filter((_, i) => i !== index),
                                }),
                                "Remove service"
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {tab === "experience" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Work experience</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          commit(
                            (prev) => ({
                              ...prev,
                              experiences: [
                                {
                                  title: "Software Engineer",
                                  companyName: "Company",
                                  icon: resolveCompanyIcon(
                                    "Company",
                                    prev.experiences.length
                                  ),
                                  iconBg: "#383E56",
                                  date: "Jan 2024 – Present",
                                  location: "",
                                  subtitle: "Product engineering · web platforms",
                                  points: ["Describe your impact here."],
                                },
                                ...prev.experiences,
                              ],
                            }),
                            "Add experience"
                          )
                        }
                      >
                        + Add role
                      </button>
                    </div>
                    {draft.experiences.map((exp, index) => (
                      <div key={index} className={sectionCard}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelClass}>Title</label>
                            <input
                              className={fieldClass}
                              value={exp.title}
                              onChange={(e) => {
                                const title = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = { ...experiences[index], title };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Company</label>
                            <input
                              className={fieldClass}
                              value={exp.companyName}
                              onChange={(e) => {
                                const companyName = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = {
                                    ...experiences[index],
                                    companyName,
                                    icon: resolveCompanyIcon(companyName, index),
                                  };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Date range</label>
                            <input
                              className={fieldClass}
                              value={exp.date}
                              onChange={(e) => {
                                const date = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = {
                                    ...experiences[index],
                                    date,
                                  };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Location</label>
                            <input
                              className={fieldClass}
                              value={exp.location || ""}
                              placeholder="Bengaluru, India"
                              onChange={(e) => {
                                const location = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = {
                                    ...experiences[index],
                                    location,
                                  };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelClass}>
                              Focus subtitle (shown under company)
                            </label>
                            <input
                              className={fieldClass}
                              value={exp.subtitle || ""}
                              placeholder="e.g. Enterprise security · backend services"
                              onChange={(e) => {
                                const subtitle = e.target.value;
                                setDraft((prev) => {
                                  const experiences = [...prev.experiences];
                                  experiences[index] = {
                                    ...experiences[index],
                                    subtitle,
                                  };
                                  return { ...prev, experiences };
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>
                            Bullet points (one per line)
                          </label>
                          <textarea
                            className={`${fieldClass} min-h-[100px]`}
                            value={exp.points.join("\n")}
                            onChange={(e) => {
                              const points = e.target.value
                                .split("\n")
                                .map((p) => p.trim())
                                .filter(Boolean);
                              setDraft((prev) => {
                                const experiences = [...prev.experiences];
                                experiences[index] = {
                                  ...experiences[index],
                                  points: points.length ? points : [""],
                                };
                                return { ...prev, experiences };
                              });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() =>
                            commit(
                              (prev) => ({
                                ...prev,
                                experiences: prev.experiences.filter((_, i) => i !== index),
                              }),
                              "Remove experience"
                            )
                          }
                        >
                          Remove role
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "skills" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Technologies</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          commit(
                            (prev) => ({
                              ...prev,
                              technologies: [
                                ...prev.technologies,
                                {
                                  name: "New Skill",
                                  icon: resolveTechIcon("New Skill"),
                                },
                              ],
                            }),
                            "Add skill"
                          )
                        }
                      >
                        + Add skill
                      </button>
                    </div>
                    <p className="text-sm text-secondary">
                      Edit each skill name and choose its icon (built-in set, auto-resolve, initials, upload, or URL).
                      Bulk edit replaces names and re-resolves icons automatically.
                    </p>
                    <div className={sectionCard}>
                      <label className={labelClass}>Bulk edit names</label>
                      <textarea
                        className={`${fieldClass} min-h-[80px]`}
                        value={draft.technologies.map((t) => t.name).join(", ")}
                        onChange={(e) => {
                          const names = e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          setDraft(
                            (prev) => ({
                              ...prev,
                              technologies: names.map((name) => ({
                                name,
                                icon: resolveTechIcon(name),
                              })),
                            }),
                            { label: "Bulk edit skills" }
                          );
                        }}
                      />
                    </div>

                    {draft.technologies.map((tech, index) => (
                      <div key={`skill-${index}`} className={sectionCard}>
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#151030] p-2">
                            <img
                              src={tech.icon}
                              alt=""
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="min-w-[180px] flex-1 space-y-3">
                            <div>
                              <label className={labelClass}>Skill name</label>
                              <input
                                className={fieldClass}
                                value={tech.name}
                                onChange={(e) => {
                                  const name = e.target.value;
                                  setDraft((prev) => {
                                    const technologies = [...prev.technologies];
                                    // Keep custom icon if user already overrode it with upload/url/picker
                                    const keepIcon =
                                      technologies[index].icon.startsWith("data:image/") &&
                                      !technologies[index].icon.includes("svg+xml");
                                    technologies[index] = {
                                      name,
                                      icon: keepIcon
                                        ? technologies[index].icon
                                        : resolveTechIcon(name || "Skill"),
                                    };
                                    return { ...prev, technologies };
                                  });
                                }}
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Icon</label>
                              <select
                                className={fieldClass}
                                value={
                                  TECH_ICON_OPTIONS.find((o) => o.icon === tech.icon)?.id ||
                                  (tech.icon.startsWith("data:") || tech.icon.startsWith("http")
                                    ? "custom"
                                    : "auto")
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (value === "custom") return;
                                  commit((prev) => {
                                    const technologies = [...prev.technologies];
                                    if (value === "auto") {
                                      technologies[index] = {
                                        ...technologies[index],
                                        icon: resolveTechIcon(technologies[index].name),
                                      };
                                    } else if (value === "initials") {
                                      technologies[index] = {
                                        ...technologies[index],
                                        icon: makeInitialsIcon(
                                          technologies[index].name || "SK",
                                          "#151030"
                                        ),
                                      };
                                    } else {
                                      const opt = TECH_ICON_OPTIONS.find((o) => o.id === value);
                                      if (opt) {
                                        technologies[index] = {
                                          ...technologies[index],
                                          icon: opt.icon,
                                        };
                                      }
                                    }
                                    return { ...prev, technologies };
                                  }, "Change skill icon");
                                }}
                              >
                                <option value="auto">Auto-resolve from name</option>
                                <option value="initials">Initials badge</option>
                                {tech.icon.startsWith("data:") || tech.icon.startsWith("http") ? (
                                  <option value="custom">Custom (current)</option>
                                ) : null}
                                {TECH_ICON_OPTIONS.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className={labelClass}>Upload icon image</label>
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                  className="block w-full text-xs text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-[#915EFF] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (file.size > 500_000) {
                                      setError("Icon image must be under 500KB.");
                                      return;
                                    }
                                    try {
                                      const dataUrl = await fileToDataUrl(file);
                                      commit((prev) => {
                                        const technologies = [...prev.technologies];
                                        technologies[index] = {
                                          ...technologies[index],
                                          icon: dataUrl,
                                        };
                                        return { ...prev, technologies };
                                      }, "Upload skill icon");
                                      setError(null);
                                    } catch {
                                      setError("Failed to read icon image.");
                                    }
                                  }}
                                />
                              </div>
                              <div>
                                <label className={labelClass}>Or icon URL / data URL</label>
                                <input
                                  className={fieldClass}
                                  placeholder="https://… or data:image/…"
                                  value={
                                    tech.icon.startsWith("http") ||
                                    (tech.icon.startsWith("data:image/") &&
                                      !tech.icon.includes("svg+xml;charset=utf-8"))
                                      ? tech.icon
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const icon = e.target.value.trim();
                                    setDraft((prev) => {
                                      const technologies = [...prev.technologies];
                                      technologies[index] = {
                                        ...technologies[index],
                                        icon: icon || resolveTechIcon(technologies[index].name),
                                      };
                                      return { ...prev, technologies };
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className={btnDanger}
                            onClick={() =>
                              commit(
                                (prev) => ({
                                  ...prev,
                                  technologies: prev.technologies.filter((_, i) => i !== index),
                                }),
                                "Remove skill"
                              )
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "projects" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Projects</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          commit((prev) => {
                            const name = "New Project";
                            return {
                              ...prev,
                              projects: [
                                ...prev.projects,
                                {
                                  name,
                                  description: "Describe this project.",
                                  tags: [
                                    { name: "react", color: TAG_COLORS[0] },
                                  ],
                                  image: makeProjectPlaceholder(name, prev.projects.length),
                                  sourceCodeLink: "https://github.com/",
                                },
                              ],
                            };
                          }, "Add project")
                        }
                      >
                        + Add project
                      </button>
                    </div>
                    <div className={sectionCard}>
                      <label className={labelClass}>Projects intro</label>
                      <textarea
                        className={`${fieldClass} min-h-[80px]`}
                        value={draft.config.sections.works.content}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            config: {
                              ...prev.config,
                              sections: {
                                ...prev.config.sections,
                                works: {
                                  ...prev.config.sections.works,
                                  content: e.target.value,
                                },
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    {draft.projects.map((project, index) => (
                      <div key={index} className={sectionCard}>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className={labelClass}>Name</label>
                            <input
                              className={fieldClass}
                              value={project.name}
                              onChange={(e) => {
                                const name = e.target.value;
                                setDraft((prev) => {
                                  const projects = [...prev.projects];
                                  projects[index] = {
                                    ...projects[index],
                                    name,
                                    image: projects[index].image.startsWith("data:")
                                      ? makeProjectPlaceholder(name, index)
                                      : projects[index].image,
                                  };
                                  return { ...prev, projects };
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>Source / demo link</label>
                            <input
                              className={fieldClass}
                              value={project.sourceCodeLink}
                              onChange={(e) => {
                                const sourceCodeLink = e.target.value;
                                setDraft((prev) => {
                                  const projects = [...prev.projects];
                                  projects[index] = { ...projects[index], sourceCodeLink };
                                  return { ...prev, projects };
                                });
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={labelClass}>Description</label>
                          <textarea
                            className={`${fieldClass} min-h-[80px]`}
                            value={project.description}
                            onChange={(e) => {
                              const description = e.target.value;
                              setDraft((prev) => {
                                const projects = [...prev.projects];
                                projects[index] = { ...projects[index], description };
                                return { ...prev, projects };
                              });
                            }}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Tags (comma-separated)</label>
                          <input
                            className={fieldClass}
                            value={project.tags.map((t) => t.name).join(", ")}
                            onChange={(e) => {
                              const tags = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((name, ti) => ({
                                  name,
                                  color: TAG_COLORS[ti % TAG_COLORS.length],
                                }));
                              setDraft((prev) => {
                                const projects = [...prev.projects];
                                projects[index] = {
                                  ...projects[index],
                                  tags: tags.length
                                    ? tags
                                    : [{ name: "web", color: TAG_COLORS[0] }],
                                };
                                return { ...prev, projects };
                              });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() =>
                            commit(
                              (prev) => ({
                                ...prev,
                                projects: prev.projects.filter((_, i) => i !== index),
                              }),
                              "Remove project"
                            )
                          }
                        >
                          Remove project
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "testimonials" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">Testimonials</h3>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          commit(
                            (prev) => ({
                              ...prev,
                              testimonials: [
                                ...prev.testimonials,
                                {
                                  testimonial: "Great collaborator and engineer.",
                                  name: "Colleague",
                                  designation: "Manager",
                                  company: "Company",
                                  image: makeInitialsIcon("Colleague", "#915EFF"),
                                },
                              ],
                            }),
                            "Add testimonial"
                          )
                        }
                      >
                        + Add testimonial
                      </button>
                    </div>
                    <p className="text-sm text-secondary">
                      Leave empty to hide the testimonials section on the site. Resume upload clears demo testimonials by default.
                    </p>
                    {draft.testimonials.map((item, index) => (
                      <div key={index} className={sectionCard}>
                        <div>
                          <label className={labelClass}>Quote</label>
                          <textarea
                            className={`${fieldClass} min-h-[80px]`}
                            value={item.testimonial}
                            onChange={(e) => {
                              const testimonial = e.target.value;
                              setDraft((prev) => {
                                const testimonials = [...prev.testimonials];
                                testimonials[index] = {
                                  ...testimonials[index],
                                  testimonial,
                                };
                                return { ...prev, testimonials };
                              });
                            }}
                          />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {(
                            [
                              ["name", "Name"],
                              ["designation", "Role"],
                              ["company", "Company"],
                            ] as const
                          ).map(([key, label]) => (
                            <div key={key}>
                              <label className={labelClass}>{label}</label>
                              <input
                                className={fieldClass}
                                value={item[key]}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setDraft((prev) => {
                                    const testimonials = [...prev.testimonials];
                                    testimonials[index] = {
                                      ...testimonials[index],
                                      [key]: value,
                                      ...(key === "name"
                                        ? { image: makeInitialsIcon(value || "U") }
                                        : {}),
                                    };
                                    return { ...prev, testimonials };
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={btnDanger}
                          onClick={() =>
                            commit(
                              (prev) => ({
                                ...prev,
                                testimonials: prev.testimonials.filter((_, i) => i !== index),
                              }),
                              "Remove testimonial"
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "theme3d" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="text-base font-semibold text-white">
                        3D & visual theme
                      </h3>
                      <p className="text-sm text-secondary">
                        Switch hero/contact scenes, effects, quality, and accent palette.
                        Everything is saved in this browser with your portfolio config — no
                        external services required.
                      </p>
                      <label className="flex items-center gap-3 text-sm text-white">
                        <input
                          type="checkbox"
                          checked={draft.theme3d?.enabled ?? true}
                          onChange={(e) => updateTheme("enabled", e.target.checked)}
                          className="h-4 w-4 accent-[#915EFF]"
                        />
                        Enable 3D canvases (master switch)
                      </label>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Hero scene pack</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {HERO_SCENE_OPTIONS.map((opt) => {
                          const active = draft.theme3d?.heroScene === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => updateTheme("heroScene", opt.id)}
                              className={`rounded-xl border p-3 text-left transition ${
                                active
                                  ? "border-[#915EFF] bg-[#915EFF]/15"
                                  : "border-white/10 hover:border-white/25"
                              }`}
                            >
                              <div className="text-sm font-semibold text-white">
                                {opt.label}
                                {opt.heavy ? (
                                  <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-secondary">
                                    desktop
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-secondary">{opt.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Contact scene pack</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {CONTACT_SCENE_OPTIONS.map((opt) => {
                          const active = draft.theme3d?.contactScene === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => updateTheme("contactScene", opt.id)}
                              className={`rounded-xl border p-3 text-left transition ${
                                active
                                  ? "border-[#915EFF] bg-[#915EFF]/15"
                                  : "border-white/10 hover:border-white/25"
                              }`}
                            >
                              <div className="text-sm font-semibold text-white">
                                {opt.label}
                              </div>
                              <p className="mt-1 text-xs text-secondary">{opt.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Color mode</h3>
                      <p className="mb-2 text-xs text-secondary">
                        Switch the whole site between dark navy and bright light surfaces.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {COLOR_MODE_OPTIONS.map((opt) => {
                          const active =
                            (draft.theme3d?.colorMode ?? "dark") === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => applyColorMode(opt.id)}
                              className={`rounded-xl border p-3 text-left transition ${
                                active
                                  ? "border-[#915EFF] bg-[#915EFF]/15"
                                  : "border-white/10 hover:border-white/25"
                              }`}
                            >
                              <div className="text-sm font-semibold text-white">
                                {opt.label}
                              </div>
                              <p className="mt-1 text-xs text-secondary">
                                {opt.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Accent palette</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {PALETTE_OPTIONS.map((opt) => {
                          const active = draft.theme3d?.palette === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => applyPalettePreset(opt.id)}
                              className={`rounded-xl border p-3 text-left transition ${
                                active
                                  ? "border-[#915EFF] bg-[#915EFF]/15"
                                  : "border-white/10 hover:border-white/25"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-4 w-4 rounded-full"
                                  style={{ backgroundColor: opt.accent }}
                                />
                                <span className="text-sm font-semibold text-white">
                                  {opt.label}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-secondary">{opt.description}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Effects</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm text-white">
                          <input
                            type="checkbox"
                            checked={draft.theme3d?.showStars ?? true}
                            onChange={(e) => updateTheme("showStars", e.target.checked)}
                            className="h-4 w-4 accent-[#915EFF]"
                          />
                          Starfield background
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white">
                          <input
                            type="checkbox"
                            checked={draft.theme3d?.autoRotate ?? true}
                            onChange={(e) => updateTheme("autoRotate", e.target.checked)}
                            className="h-4 w-4 accent-[#915EFF]"
                          />
                          Auto-rotate scenes
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white">
                          <input
                            type="checkbox"
                            checked={draft.theme3d?.allowOrbit ?? true}
                            onChange={(e) => updateTheme("allowOrbit", e.target.checked)}
                            className="h-4 w-4 accent-[#915EFF]"
                          />
                          Allow orbit drag
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white">
                          <input
                            type="checkbox"
                            checked={draft.theme3d?.mobile3d ?? false}
                            onChange={(e) => updateTheme("mobile3d", e.target.checked)}
                            className="h-4 w-4 accent-[#915EFF]"
                          />
                          Light 3D on mobile
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className={labelClass}>Motion speed</label>
                          <input
                            type="range"
                            min={0.25}
                            max={2}
                            step={0.05}
                            value={draft.theme3d?.motionSpeed ?? 1}
                            onChange={(e) =>
                              updateTheme("motionSpeed", Number(e.target.value), {
                                immediate: false,
                              })
                            }
                            className="w-full accent-[#915EFF]"
                          />
                          <p className="text-xs text-secondary">
                            {(draft.theme3d?.motionSpeed ?? 1).toFixed(2)}×
                          </p>
                        </div>
                        <div>
                          <label className={labelClass}>Stars density</label>
                          <input
                            type="range"
                            min={0.25}
                            max={2}
                            step={0.05}
                            value={draft.theme3d?.starsDensity ?? 1}
                            onChange={(e) =>
                              updateTheme("starsDensity", Number(e.target.value), {
                                immediate: false,
                              })
                            }
                            className="w-full accent-[#915EFF]"
                          />
                          <p className="text-xs text-secondary">
                            {(draft.theme3d?.starsDensity ?? 1).toFixed(2)}×
                          </p>
                        </div>
                        <div>
                          <label className={labelClass}>Stars color</label>
                          <input
                            type="color"
                            value={draft.theme3d?.starsColor || "#f272c8"}
                            onChange={(e) =>
                              updateTheme("starsColor", e.target.value, {
                                immediate: false,
                              })
                            }
                            className="h-10 w-full cursor-pointer rounded border border-white/10 bg-transparent"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Quality</label>
                          <select
                            className={fieldClass}
                            value={draft.theme3d?.quality ?? "medium"}
                            onChange={(e) =>
                              updateTheme(
                                "quality",
                                e.target.value as TTheme3d["quality"]
                              )
                            }
                          >
                            <option value="low">Low (best performance)</option>
                            <option value="medium">Medium (balanced)</option>
                            <option value="high">High (sharpest)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass}>Reduced motion</label>
                          <select
                            className={fieldClass}
                            value={draft.theme3d?.reducedMotion ?? "system"}
                            onChange={(e) =>
                              updateTheme(
                                "reducedMotion",
                                e.target.value as TTheme3d["reducedMotion"]
                              )
                            }
                          >
                            <option value="system">Follow system preference</option>
                            <option value="force-on">Force reduce motion</option>
                            <option value="force-off">Force full motion</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Reset 3D theme</h3>
                      <p className="text-sm text-secondary">
                        Restore default packs, palette, and effect settings without resetting
                        portfolio content.
                      </p>
                      <button
                        type="button"
                        className={btnGhost}
                        onClick={() =>
                          commit(
                            (prev) => ({
                              ...prev,
                              theme3d: { ...defaultTheme3d },
                            }),
                            "Reset theme to defaults"
                          )
                        }
                      >
                        Reset theme to defaults
                      </button>
                    </div>
                  </div>
                )}

                {tab === "history" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Draft undo / redo</h3>
                      <p className="text-sm text-secondary">
                        Session history for this panel. Typing is coalesced into one step after a
                        short pause. Resume uploads, JSON import, icons, and theme picks create an
                        immediate step. Shortcuts:{" "}
                        <kbd className="rounded bg-white/10 px-1">Ctrl</kbd>+
                        <kbd className="rounded bg-white/10 px-1">Z</kbd> undo,{" "}
                        <kbd className="rounded bg-white/10 px-1">Ctrl</kbd>+
                        <kbd className="rounded bg-white/10 px-1">Y</kbd> redo.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btnGhost}
                          disabled={!canUndo}
                          onClick={() => {
                            if (undo()) setStatus(`Undo: ${undoLabel ?? "previous edit"}`);
                          }}
                        >
                          Undo{undoLabel ? `: ${undoLabel}` : ""}
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          disabled={!canRedo}
                          onClick={() => {
                            if (redo()) setStatus(`Redo: ${redoLabel ?? "edit"}`);
                          }}
                        >
                          Redo{redoLabel ? `: ${redoLabel}` : ""}
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          disabled={!isDirty}
                          onClick={discardDraftToLive}
                        >
                          Discard draft → live
                        </button>
                      </div>
                    </div>

                    <div className={sectionCard}>
                      <VersionComparePanel
                        versions={versions}
                        live={data}
                        draft={draft}
                        onApplyToDraft={(next, label) => {
                          commit(() => next, label);
                        }}
                        onStatus={setStatus}
                        onError={setError}
                      />
                    </div>

                    <div className={sectionCard}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-semibold text-white">Applied version history</h3>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => refreshVersions()}
                        >
                          Refresh
                        </button>
                      </div>
                      <p className="text-sm text-secondary">
                        Snapshots are created when you Apply, import JSON, reset, or restore a
                        version. Shared across tabs via this browser&apos;s storage (newest last).
                        Use Compare above to merge only selected fields (icons, 3D, copy) into the draft.
                      </p>
                      {versions.length === 0 ? (
                        <p className="text-sm text-secondary">
                          No versions yet. Apply your draft to create the first snapshot.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {[...versions].reverse().map((entry, index) => {
                            const isLatest = index === 0;
                            return (
                              <li
                                key={`${entry.id}-${entry.at}-${index}`}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-black-200/40 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-white">
                                    {entry.label}
                                    {isLatest ? (
                                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                                        latest
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-secondary">
                                    {formatWhen(entry.at)}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className={btnPrimary}
                                    onClick={() => {
                                      // Load into draft first so user can review / undo before Apply
                                      commit(
                                        () => ({
                                          ...entry.data,
                                          theme3d: clampTheme3d(entry.data.theme3d),
                                        }),
                                        `Load version: ${entry.label}`
                                      );
                                      setStatus(
                                        `Loaded “${entry.label}” into draft. Apply to make it live, or Undo to go back.`
                                      );
                                      setError(null);
                                    }}
                                  >
                                    Load to draft
                                  </button>
                                  <button
                                    type="button"
                                    className={btnGhost}
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          `Restore “${entry.label}” to the live portfolio now?`
                                        )
                                      ) {
                                        return;
                                      }
                                      const ok = restoreVersion(entry.id);
                                      if (!ok) {
                                        setError("Could not restore that version.");
                                        return;
                                      }
                                      const restored = versions.find((v) => v.id === entry.id);
                                      if (restored) {
                                        resetDraft(
                                          {
                                            ...restored.data,
                                            theme3d: clampTheme3d(restored.data.theme3d),
                                          },
                                          {
                                            baseFingerprint: portfolioFingerprint(
                                              restored.data
                                            ),
                                          }
                                        );
                                      } else {
                                        discardDraftToLive();
                                      }
                                      setStatus(`Restored live portfolio: ${entry.label}`);
                                      setError(null);
                                      refreshVersions();
                                    }}
                                  >
                                    Restore live
                                  </button>
                                  <button
                                    type="button"
                                    className={btnDanger}
                                    onClick={() => {
                                      if (
                                        !window.confirm(
                                          `Delete version “${entry.label}” from history?`
                                        )
                                      ) {
                                        return;
                                      }
                                      deleteVersion(entry.id);
                                      setStatus("Version removed from history.");
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {tab === "data" && (
                  <div className="space-y-4">
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Export / import JSON</h3>
                      <p className="text-sm text-secondary">
                        Download your full portfolio configuration (including 3D & theme) or paste
                        JSON from another device. Import applies live, records a version, and
                        updates this draft (undoable in the draft stack for further tweaks).
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={() => {
                            flushHistory();
                            const text = JSON.stringify(draft, null, 2);
                            setJsonText(text);
                            const blob = new Blob([text], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "portfolio-config.json";
                            a.click();
                            URL.revokeObjectURL(url);
                            setStatus("JSON exported.");
                          }}
                        >
                          Download draft JSON
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => setJsonText(exportJson())}
                        >
                          Load live config into editor
                        </button>
                      </div>
                      <textarea
                        className={`${fieldClass} min-h-[200px] font-mono text-xs`}
                        placeholder="Paste portfolio JSON here…"
                        value={jsonText}
                        onChange={(e) => setJsonText(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={() => {
                            try {
                              const normalized = parsePortfolioJson(jsonText);
                              if (!normalized) {
                                throw new Error("Invalid portfolio JSON");
                              }
                              const next = {
                                ...normalized,
                                theme3d: clampTheme3d(normalized.theme3d),
                              };
                              importJson(jsonText, "Imported JSON");
                              // Same normalized snapshot in draft so live/draft fingerprints match
                              commit(() => next, "Import JSON into draft");
                              markClean(portfolioFingerprint(next));
                              clearDraftPersistence();
                              refreshVersions();
                              setStatus(
                                "JSON imported, applied live, and recorded in version history."
                              );
                              setError(null);
                            } catch (err) {
                              setError(
                                err instanceof Error ? err.message : "Invalid JSON"
                              );
                            }
                          }}
                        >
                          Import JSON (apply live)
                        </button>
                        <button
                          type="button"
                          className={btnGhost}
                          onClick={() => {
                            try {
                              const normalized = parsePortfolioJson(jsonText);
                              if (!normalized) {
                                throw new Error("Invalid portfolio JSON");
                              }
                              commit(
                                () => ({
                                  ...normalized,
                                  theme3d: clampTheme3d(normalized.theme3d),
                                }),
                                "Import JSON into draft only"
                              );
                              setStatus(
                                "JSON loaded into draft only. Review, then Apply to publish."
                              );
                              setError(null);
                            } catch (err) {
                              setError(
                                err instanceof Error ? err.message : "Invalid JSON"
                              );
                            }
                          }}
                        >
                          Load into draft only
                        </button>
                      </div>
                    </div>
                    <div className={sectionCard}>
                      <h3 className="font-semibold text-white">Reset</h3>
                      <p className="text-sm text-secondary">
                        Restore the original demo portfolio content. A version snapshot is kept so
                        you can restore your previous applied config from History.
                      </p>
                      <button
                        type="button"
                        className={btnDanger}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Reset portfolio to defaults? Your previous applied config stays in History."
                            )
                          ) {
                            resetToDefaults();
                            resetDraft(clonePortfolio(defaultPortfolioData), {
                              baseFingerprint: portfolioFingerprint(defaultPortfolioData),
                            });
                            refreshVersions();
                            setStatus(
                              "Portfolio reset to original demo content (saved in version history)."
                            );
                            setError(null);
                          }
                        }}
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
              <p className="text-xs text-secondary">
                {isDirty
                  ? "You have unsaved draft changes (auto-saved in this browser until Apply)."
                  : "Draft matches the live portfolio."}{" "}
                <span className="text-white/50">Ctrl+Z / Ctrl+Y for undo/redo.</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnGhost}
                  disabled={!isDirty}
                  onClick={discardDraftToLive}
                >
                  Discard draft
                </button>
                <button type="button" className={btnGhost} onClick={onClose}>
                  {isDirty ? "Close (keep draft)" : "Close"}
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={isPreviewMode}
                  title={
                    isPreviewMode
                      ? "Exit preview mode to apply changes"
                      : "Apply draft to the active profile"
                  }
                  onClick={() => {
                    applyDraft();
                  }}
                >
                  Apply to portfolio
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={isPreviewMode}
                  title={
                    isPreviewMode
                      ? "Exit preview mode to apply changes"
                      : "Apply draft and close"
                  }
                  onClick={() => {
                    applyDraft();
                    onClose();
                  }}
                >
                  Apply & close
                </button>
              </div>
            </footer>
          </div>
        </div>
  );
};

/** FAB only — no portfolio context subscription while closed. */
const CustomizeFab: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-105"
    style={{
      backgroundColor: "var(--accent, #915EFF)",
      boxShadow: "0 10px 25px var(--accent-soft, rgba(145, 94, 255, 0.4))",
    }}
    aria-label="Customize portfolio"
  >
    <span className="text-base">⚙</span>
    Customize
  </button>
);

/**
 * Mounts the heavy panel only when open so theme thrashing does not re-render
 * the entire configurator tree. Remounts on profile switch so each profile
 * loads its own draft/history without clobbering another profile's unsaved work.
 */
const PortfolioConfigurator: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { activeProfileId } = usePortfolioAll();
  if (!open) {
    return <CustomizeFab onOpen={() => setOpen(true)} />;
  }
  return (
    <ConfiguratorPanel
      key={activeProfileId || "default"}
      onClose={() => setOpen(false)}
    />
  );
};

export default PortfolioConfigurator;
