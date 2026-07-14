import React, { useMemo, useState } from "react";
import type { TPortfolioData } from "../../types/portfolio";
import type { VersionEntry } from "../../utils/history";
import {
  applySelectedDiffs,
  diffPortfolios,
  groupDiffEntries,
  portfolioFingerprint,
  type DiffGroup,
  type PortfolioDiffEntry,
} from "../../utils/history";
import { clampTheme3d } from "../../constants/theme3d";

const fieldClass =
  "w-full rounded-lg border border-white/10 bg-[#151030] px-3 py-2 text-sm text-white outline-none focus:border-[#915EFF]";
const btnPrimary =
  "rounded-xl bg-[#915EFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7d4ee0] disabled:cursor-not-allowed disabled:opacity-50";
const btnGhost =
  "rounded-xl border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10";

/** Synthetic snapshot ids for draft / live endpoints in the picker. */
export const COMPARE_LIVE_ID = "__live__";
export const COMPARE_DRAFT_ID = "__draft__";

export type VersionComparePanelProps = {
  versions: VersionEntry[];
  live: TPortfolioData;
  draft: TPortfolioData;
  /**
   * Merge selected compare-side values into the configurator draft only.
   * Must record an immediate undo step; must NOT commit live / multi-tab.
   */
  onApplyToDraft: (next: TPortfolioData, label: string) => void;
  onStatus?: (message: string) => void;
  onError?: (message: string | null) => void;
};

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

function resolveSnapshot(
  id: string,
  versions: VersionEntry[],
  live: TPortfolioData,
  draft: TPortfolioData
): { data: TPortfolioData; label: string } | null {
  if (id === COMPARE_LIVE_ID) {
    return {
      data: { ...live, theme3d: clampTheme3d(live.theme3d) },
      label: "Live portfolio",
    };
  }
  if (id === COMPARE_DRAFT_ID) {
    return {
      data: { ...draft, theme3d: clampTheme3d(draft.theme3d) },
      label: "Current draft",
    };
  }
  const entry = versions.find((v) => v.id === id);
  if (!entry) return null;
  return {
    data: { ...entry.data, theme3d: clampTheme3d(entry.data.theme3d) },
    label: entry.label,
  };
}

function kindBadge(kind: PortfolioDiffEntry["kind"]): string {
  switch (kind) {
    case "icon":
      return "icon";
    case "theme":
      return "3D";
    case "list":
      return "list";
    case "scalar":
      return "flag";
    default:
      return "text";
  }
}

export const VersionComparePanel: React.FC<VersionComparePanelProps> = ({
  versions,
  live,
  draft,
  onApplyToDraft,
  onStatus,
  onError,
}) => {
  const newestId = versions.length ? versions[versions.length - 1].id : "";
  const secondNewestId =
    versions.length > 1 ? versions[versions.length - 2].id : COMPARE_LIVE_ID;

  const [fromId, setFromId] = useState<string>(
    () => secondNewestId || COMPARE_LIVE_ID
  );
  const [toId, setToId] = useState<string>(() => newestId || COMPARE_DRAFT_ID);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  /** Recompute token so users can re-diff after draft edits without remount. */
  const [diffGen, setDiffGen] = useState(0);

  const options = useMemo(() => {
    const opts: Array<{ id: string; label: string }> = [
      { id: COMPARE_LIVE_ID, label: "Live portfolio (applied)" },
      { id: COMPARE_DRAFT_ID, label: "Current draft (unsaved)" },
      ...[...versions]
        .reverse()
        .map((v) => ({
          id: v.id,
          label: `${v.label} · ${formatWhen(v.at)}`,
        })),
    ];
    return opts;
  }, [versions]);

  const fromSnap = useMemo(
    () => resolveSnapshot(fromId, versions, live, draft),
    // draft/live intentionally included so draft endpoint stays current
    [fromId, versions, live, draft, diffGen]
  );
  const toSnap = useMemo(
    () => resolveSnapshot(toId, versions, live, draft),
    [toId, versions, live, draft, diffGen]
  );

  const entries = useMemo(() => {
    if (!fromSnap || !toSnap) return [] as PortfolioDiffEntry[];
    if (fromId === toId) return [];
    // Fast path: identical fingerprints → empty
    if (
      portfolioFingerprint(fromSnap.data) === portfolioFingerprint(toSnap.data)
    ) {
      return [];
    }
    return diffPortfolios(fromSnap.data, toSnap.data);
  }, [fromSnap, toSnap, fromId, toId]);

  const grouped = useMemo(() => groupDiffEntries(entries), [entries]);

  // When the pair or entry set changes, default-select all new ids
  const entryIdsKey = entries.map((e) => e.id).join("\0");
  React.useEffect(() => {
    setSelected(new Set(entries.map((e) => e.id)));
  }, [fromId, toId, entryIdsKey]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (group: DiffGroup, on: boolean) => {
    const ids = entries.filter((e) => e.group === group).map((e) => e.id);
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const selectAll = (on: boolean) => {
    setSelected(on ? new Set(entries.map((e) => e.id)) : new Set());
  };

  const selectedCount = selected.size;
  const canApply = selectedCount > 0 && fromSnap && toSnap && fromId !== toId;

  const applySelected = () => {
    if (!fromSnap || !toSnap || !canApply) return;
    try {
      // Apply onto current draft (not the "from" snapshot) so unrelated
      // draft edits outside the compared pair are preserved when possible.
      // Selected paths take the "to" (compare) side values.
      const next = applySelectedDiffs(draft, entries, selected);
      const label = `Selective restore (${selectedCount}) from “${toSnap.label}”`;
      onApplyToDraft(next, label);
      onError?.(null);
      onStatus?.(
        `Merged ${selectedCount} change${selectedCount === 1 ? "" : "s"} from “${toSnap.label}” into your draft. Undo to reverse; Apply to publish live.`
      );
      setDiffGen((g) => g + 1);
    } catch (err) {
      onError?.(
        err instanceof Error ? err.message : "Selective restore failed"
      );
    }
  };

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-white">Compare versions</h3>
        <p className="text-sm text-secondary">
          Pick any two snapshots (saved versions, live site, or current draft).
          Review differences — including uploaded icons and 3D settings — then
          merge only the changes you want into the draft. Live portfolio and
          other tabs are untouched until you Apply.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-secondary">
            Base (from)
          </span>
          <select
            className={fieldClass}
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          >
            {options.map((o) => (
              <option key={`from-${o.id}`} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`${btnGhost} shrink-0 px-3`}
          onClick={swap}
          title="Swap base and compare"
        >
          ⇄
        </button>
        <label className="block min-w-0">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-secondary">
            Compare (to)
          </span>
          <select
            className={fieldClass}
            value={toId}
            onChange={(e) => setToId(e.target.value)}
          >
            {options.map((o) => (
              <option key={`to-${o.id}`} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnGhost}
          onClick={() => setDiffGen((g) => g + 1)}
        >
          Refresh diff
        </button>
        <button
          type="button"
          className={btnGhost}
          disabled={!entries.length}
          onClick={() => selectAll(true)}
        >
          Select all
        </button>
        <button
          type="button"
          className={btnGhost}
          disabled={!entries.length}
          onClick={() => selectAll(false)}
        >
          Select none
        </button>
        <span className="text-xs text-secondary">
          {fromId === toId
            ? "Choose two different snapshots."
            : entries.length === 0
              ? "No differences."
              : `${selectedCount} of ${entries.length} change${entries.length === 1 ? "" : "s"} selected`}
        </span>
      </div>

      {fromId !== toId && entries.length > 0 ? (
        <div className="max-h-[min(50vh,420px)] space-y-3 overflow-y-auto pr-1">
          {grouped.map(({ group, label, entries: groupEntries }) => {
            const groupSelected = groupEntries.every((e) => selected.has(e.id));
            const groupPartial =
              !groupSelected && groupEntries.some((e) => selected.has(e.id));
            return (
              <div
                key={group}
                className="rounded-lg border border-white/10 bg-black-200/30 p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#915EFF]"
                      checked={groupSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = groupPartial;
                      }}
                      onChange={(e) => toggleGroup(group, e.target.checked)}
                    />
                    {label}
                    <span className="text-xs font-normal text-secondary">
                      ({groupEntries.length})
                    </span>
                  </label>
                </div>
                <ul className="space-y-1.5">
                  {groupEntries.map((entry) => (
                    <li key={entry.id}>
                      <label className="flex cursor-pointer gap-2 rounded-md px-1 py-1 hover:bg-white/5">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#915EFF]"
                          checked={selected.has(entry.id)}
                          onChange={() => toggle(entry.id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-white">{entry.label}</span>
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                              {kindBadge(entry.kind)}
                            </span>
                          </span>
                          <span className="block truncate text-xs text-secondary">
                            {entry.summary}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btnPrimary}
          disabled={!canApply}
          onClick={applySelected}
        >
          Merge selected into draft
          {selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>
      </div>
    </div>
  );
};

export default VersionComparePanel;
