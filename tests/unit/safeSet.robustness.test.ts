import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isQuotaError, safeSetItem } from "../../src/utils/storage/safeSet";
import { installMockLocalStorage } from "../fixtures/localStorage";

describe("safeSet robustness under pressure", () => {
  let restore: () => void;
  let ls: ReturnType<typeof installMockLocalStorage>["ls"];

  beforeEach(() => {
    ({ restore, ls } = installMockLocalStorage(150));
  });

  afterEach(() => {
    restore();
  });

  it("returns false when recovery cannot free enough space", () => {
    localStorage.setItem("pad", "x".repeat(140));
    const onQuota = vi.fn(); // does not free space
    expect(safeSetItem("big", "y".repeat(100), { onQuota })).toBe(false);
    expect(onQuota).toHaveBeenCalled();
    expect(localStorage.getItem("big")).toBeNull();
  });

  it("succeeds on second recovery attempt when first free is partial", () => {
    localStorage.setItem("a", "x".repeat(80));
    localStorage.setItem("b", "x".repeat(60));
    let calls = 0;
    const onQuota = vi.fn(() => {
      calls += 1;
      if (calls === 1) localStorage.removeItem("a");
      else localStorage.removeItem("b");
    });
    const ok = safeSetItem("critical", "saved-payload", { onQuota });
    expect(ok).toBe(true);
    expect(localStorage.getItem("critical")).toBe("saved-payload");
    expect(onQuota.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("non-quota errors do not call onQuota", () => {
    const onQuota = vi.fn();
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => {
      throw new TypeError("broken");
    };
    expect(safeSetItem("k", "v", { onQuota })).toBe(false);
    expect(onQuota).not.toHaveBeenCalled();
    localStorage.setItem = original;
  });

  it("recognizes Firefox quota error name", () => {
    const err = new Error("quota");
    (err as DOMException).name = "NS_ERROR_DOM_QUOTA_REACHED";
    expect(isQuotaError(err)).toBe(true);
  });

  it("quota raises after setQuota shrinks", () => {
    ls.setQuota(50);
    expect(() => localStorage.setItem("k", "x".repeat(100))).toThrow();
  });
});
