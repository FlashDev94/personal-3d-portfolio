import React, { useMemo, useState } from "react";
import { usePortfolio } from "../context/PortfolioContext";

type ProfileSwitcherProps = {
  /** Compact navbar chip vs full configurator panel. */
  variant?: "navbar" | "panel";
  className?: string;
};

/**
 * Live multi-profile switcher + shareable preview link helper.
 * Switching profiles never clears another profile's unsaved draft
 * (drafts are keyed per profile id).
 */
export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({
  variant = "navbar",
  className = "",
}) => {
  const {
    profiles,
    activeProfileId,
    activeProfile,
    isPreviewMode,
    switchProfile,
    createProfile,
    renameProfile,
    deleteProfile,
    getShareUrl,
  } = usePortfolio();

  const [copied, setCopied] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [renameTo, setRenameTo] = useState("");

  const shareUrl = useMemo(() => {
    if (!activeProfile) return "";
    return getShareUrl(activeProfile.slug, true);
  }, [activeProfile, getShareUrl]);

  const onCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback
      window.prompt("Copy preview link:", shareUrl);
    }
  };

  if (variant === "navbar") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <label className="sr-only" htmlFor="profile-switcher-nav">
          Portfolio profile
        </label>
        <select
          id="profile-switcher-nav"
          className="max-w-[9.5rem] truncate rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs font-medium text-white outline-none focus:border-[#915EFF] sm:max-w-[12rem]"
          value={activeProfileId}
          onChange={(e) => switchProfile(e.target.value)}
          title="Switch portfolio profile"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {isPreviewMode ? (
          <span className="hidden rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200 sm:inline">
            Preview
          </span>
        ) : null}
        <button
          type="button"
          className="hidden rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-secondary transition hover:bg-white/10 hover:text-white sm:inline"
          onClick={onCopy}
          title="Copy shareable preview link"
        >
          {copied ? "Copied" : "Share"}
        </button>
      </div>
    );
  }

  // Full panel (configurator)
  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <h3 className="font-semibold text-white">Profiles</h3>
        <p className="text-sm text-secondary">
          Each profile keeps its own content, 3D theme, and version history.
          Uploaded icons are stored once and shared. Unsaved drafts stay with
          their profile when you switch — including across tabs.
        </p>
      </div>

      {isPreviewMode ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Preview mode via share link. Edits are disabled; switch profile without
          preview to edit.
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => activeProfile && switchProfile(activeProfile.id, { preview: false })}
          >
            Exit preview
          </button>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-secondary">
          Active profile
        </span>
        <select
          className="w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2 text-sm text-white outline-none focus:border-[#915EFF]"
          value={activeProfileId}
          onChange={(e) => switchProfile(e.target.value)}
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({p.slug})
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/10"
          onClick={onCopy}
        >
          {copied ? "Link copied" : "Copy preview link"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/10"
          disabled={isPreviewMode}
          onClick={() => {
            const label = window.prompt("New profile name", "New profile");
            if (!label?.trim()) return;
            createProfile(label.trim(), { cloneFromActive: true });
          }}
        >
          Duplicate current
        </button>
        <button
          type="button"
          className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/10"
          disabled={isPreviewMode}
          onClick={() => {
            const label = window.prompt("New blank profile name", newLabel || "New profile");
            if (!label?.trim()) return;
            setNewLabel("");
            createProfile(label.trim(), { cloneFromActive: false });
          }}
        >
          New blank
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-[#151030] px-3 py-2 text-sm text-white outline-none focus:border-[#915EFF]"
          placeholder="Rename active profile…"
          value={renameTo}
          disabled={isPreviewMode}
          onChange={(e) => setRenameTo(e.target.value)}
        />
        <button
          type="button"
          className="rounded-xl bg-[#915EFF] px-3 py-2 text-sm font-semibold text-white hover:bg-[#7d4ee0] disabled:opacity-50"
          disabled={isPreviewMode || !renameTo.trim() || !activeProfile}
          onClick={() => {
            if (!activeProfile) return;
            renameProfile(activeProfile.id, renameTo.trim());
            setRenameTo("");
          }}
        >
          Rename
        </button>
        <button
          type="button"
          className="rounded-xl border border-red-400/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          disabled={isPreviewMode || profiles.length <= 1 || !activeProfile}
          onClick={() => {
            if (!activeProfile) return;
            if (
              !window.confirm(
                `Delete profile “${activeProfile.label}”? Its history and draft are removed. Shared icons stay for other profiles.`
              )
            ) {
              return;
            }
            deleteProfile(activeProfile.id);
          }}
        >
          Delete
        </button>
      </div>

      {shareUrl ? (
        <p className="break-all font-mono text-[11px] text-secondary">{shareUrl}</p>
      ) : null}
    </div>
  );
};

export default ProfileSwitcher;
