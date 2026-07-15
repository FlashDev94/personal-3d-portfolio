import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTabId } from "../../src/utils/history/tabId";
import { installMockLocalStorage } from "../fixtures/localStorage";

describe("getTabId", () => {
  let restore: () => void;

  beforeEach(() => {
    ({ restore } = installMockLocalStorage());
  });

  afterEach(() => {
    restore();
  });

  it("creates and reuses a stable tab id in session/local storage", () => {
    // tabId uses sessionStorage when available; fall back path still works
    const a = getTabId();
    const b = getTabId();
    expect(a).toBeTruthy();
    expect(a).toBe(b);
  });
});
