import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDraftHistory } from "../../src/hooks/useDraftHistory";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import { loadPersistedDraft } from "../../src/utils/history/draftPersist";
import { HISTORY_LIMITS } from "../../src/utils/history/types";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("useDraftHistory integration", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    restore();
  });

  it("tracks dirty, undo/redo, and persists draft with broadcast", async () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const profileId = "prof-draft";

    const peerMsgs: unknown[] = [];
    const peer = new BroadcastChannel("portfolio-sync-v1");
    peer.onmessage = (ev) => peerMsgs.push(ev.data);

    const { result } = renderHook(() =>
      useDraftHistory(live, liveFp, profileId)
    );

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.setDraft(
        (d) => {
          const n = clonePortfolio(d);
          n.config.hero.name = "Edited";
          n.theme3d = { ...n.theme3d, palette: "warm" };
          return n;
        },
        { immediate: true, label: "Edit hero" }
      );
    });

    expect(result.current.isDirty).toBe(true);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.draft.config.hero.name).toBe("Edited");
    expect(result.current.draft.theme3d.palette).toBe("warm");

    // Advance past draft persist debounce
    act(() => {
      vi.advanceTimersByTime(HISTORY_LIMITS.draftPersistMs + 50);
    });

    await waitFor(() => {
      const loaded = loadPersistedDraft(profileId);
      expect(loaded?.data.config.hero.name).toBe("Edited");
    });

    await waitFor(() => {
      expect(peerMsgs.some((m) => (m as { type: string }).type === "draft")).toBe(
        true
      );
    });

    act(() => {
      expect(result.current.undo()).toBe(true);
    });
    expect(result.current.draft.config.hero.name).toBe("Live");
    expect(result.current.canRedo).toBe(true);

    act(() => {
      expect(result.current.redo()).toBe(true);
    });
    expect(result.current.draft.config.hero.name).toBe("Edited");

    act(() => {
      result.current.markClean(portfolioFingerprint(result.current.draft));
    });
    expect(result.current.isDirty).toBe(false);

    peer.close();
  });

  it("resetDraft clears stacks and draft storage", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const { result } = renderHook(() =>
      useDraftHistory(live, liveFp, "p-reset")
    );

    act(() => {
      result.current.setDraft(
        (d) => ({ ...d, config: { ...d.config, hero: { ...d.config.hero, name: "X" } } }),
        { immediate: true, label: "x" }
      );
    });
    act(() => {
      vi.advanceTimersByTime(HISTORY_LIMITS.draftPersistMs + 50);
    });

    const next = samplePortfolio("Fresh");
    act(() => {
      result.current.resetDraft(next, {
        baseFingerprint: portfolioFingerprint(next),
      });
    });
    expect(result.current.draft.config.hero.name).toBe("Fresh");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(loadPersistedDraft("p-reset")).toBeNull();
  });
});
