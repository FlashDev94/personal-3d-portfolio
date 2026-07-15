import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDraftHistory } from "../../src/hooks/useDraftHistory";
import { portfolioFingerprint } from "../../src/utils/history/fingerprint";
import {
  loadPersistedDraft,
  clearPersistedDraft,
} from "../../src/utils/history/draftPersist";
import { HISTORY_LIMITS } from "../../src/utils/history/types";
import { installMockLocalStorage } from "../fixtures/localStorage";
import { clonePortfolio, samplePortfolio } from "../fixtures/portfolio";

describe("useDraftHistory robustness", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    clearPersistedDraft("p-robust");
    restore();
  });

  it("debounced typing coalesces into a single undo step", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const { result } = renderHook(() =>
      useDraftHistory(live, liveFp, "p-robust")
    );

    act(() => {
      result.current.setDraft((d) => {
        const n = clonePortfolio(d);
        n.config.hero.name = "T";
        return n;
      });
    });
    act(() => {
      result.current.setDraft((d) => {
        const n = clonePortfolio(d);
        n.config.hero.name = "Ty";
        return n;
      });
    });
    act(() => {
      result.current.setDraft((d) => {
        const n = clonePortfolio(d);
        n.config.hero.name = "Typ";
        return n;
      });
    });

    // Before debounce fires, undo stack may still be empty
    act(() => {
      vi.advanceTimersByTime(HISTORY_LIMITS.draftDebounceMs + 50);
    });

    expect(result.current.canUndo).toBe(true);
    act(() => {
      expect(result.current.undo()).toBe(true);
    });
    // One undo returns to pre-burst baseline (Live)
    expect(result.current.draft.config.hero.name).toBe("Live");
    expect(result.current.canUndo).toBe(false);
  });

  it("immediate structural edits create separate undo steps", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const { result } = renderHook(() =>
      useDraftHistory(live, liveFp, "p-robust")
    );

    act(() => {
      result.current.setDraft(
        (d) => {
          const n = clonePortfolio(d);
          n.config.hero.name = "Step1";
          return n;
        },
        { immediate: true, label: "Step 1" }
      );
    });
    act(() => {
      result.current.setDraft(
        (d) => {
          const n = clonePortfolio(d);
          n.config.hero.name = "Step2";
          return n;
        },
        { immediate: true, label: "Step 2" }
      );
    });

    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.undo();
    });
    expect(result.current.draft.config.hero.name).toBe("Step1");
    act(() => {
      result.current.undo();
    });
    expect(result.current.draft.config.hero.name).toBe("Live");
  });

  it("undo then redo restores exact intermediate snapshot", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const { result } = renderHook(() =>
      useDraftHistory(live, liveFp, "p-robust")
    );

    act(() => {
      result.current.setDraft(
        (d) => {
          const n = clonePortfolio(d);
          n.config.hero.name = "Mid";
          n.theme3d.palette = "neon";
          return n;
        },
        { immediate: true, label: "mid" }
      );
    });
    act(() => {
      result.current.setDraft(
        (d) => {
          const n = clonePortfolio(d);
          n.config.hero.name = "End";
          return n;
        },
        { immediate: true, label: "end" }
      );
    });

    act(() => {
      result.current.undo();
    });
    expect(result.current.draft.config.hero.name).toBe("Mid");
    expect(result.current.draft.theme3d.palette).toBe("neon");
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });
    expect(result.current.draft.config.hero.name).toBe("End");
  });

  it("persists draft after debounce and clears when markClean", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const { result } = renderHook(() =>
      useDraftHistory(live, liveFp, "p-robust")
    );

    act(() => {
      result.current.setDraft(
        (d) => {
          const n = clonePortfolio(d);
          n.config.hero.name = "Dirty";
          return n;
        },
        { immediate: true, label: "dirty" }
      );
    });
    act(() => {
      vi.advanceTimersByTime(HISTORY_LIMITS.draftPersistMs + 80);
    });

    expect(loadPersistedDraft("p-robust")?.data.config.hero.name).toBe("Dirty");

    act(() => {
      result.current.markClean(
        portfolioFingerprint(result.current.draft)
      );
      result.current.clearDraftPersistence();
    });
    expect(loadPersistedDraft("p-robust")).toBeNull();
    expect(result.current.isDirty).toBe(false);
  });

  it("skipHistory edits dirty flag without undo entry", () => {
    const live = samplePortfolio("Live");
    const liveFp = portfolioFingerprint(live);
    const { result } = renderHook(() =>
      useDraftHistory(live, liveFp, "p-robust")
    );

    act(() => {
      result.current.setDraft(
        (d) => {
          const n = clonePortfolio(d);
          n.config.hero.name = "NoHist";
          return n;
        },
        { skipHistory: true }
      );
    });
    expect(result.current.draft.config.hero.name).toBe("NoHist");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.isDirty).toBe(true);
  });
});
