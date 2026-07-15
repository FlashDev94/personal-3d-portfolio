import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isQuotaError, safeSetItem } from "../../src/utils/storage/safeSet";
import { installMockLocalStorage } from "../fixtures/localStorage";

describe("safeSetItem", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage(200));
  });

  afterEach(() => {
    restore();
  });

  it("writes when under quota", () => {
    expect(safeSetItem("k", "hello")).toBe(true);
    expect(localStorage.getItem("k")).toBe("hello");
  });

  it("detects quota errors", () => {
    const err = new Error("full");
    (err as DOMException).name = "QuotaExceededError";
    expect(isQuotaError(err)).toBe(true);
    expect(isQuotaError(new Error("other"))).toBe(false);
  });

  it("invokes onQuota and retries", () => {
    // Fill storage
    localStorage.setItem("pad", "x".repeat(180));
    const onQuota = vi.fn(() => {
      localStorage.removeItem("pad");
    });
    const ok = safeSetItem("important", "data-value", { onQuota });
    expect(onQuota).toHaveBeenCalled();
    expect(ok).toBe(true);
    expect(localStorage.getItem("important")).toBe("data-value");
  });
});
