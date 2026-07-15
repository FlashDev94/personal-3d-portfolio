import { afterEach, describe, expect, it } from "vitest";
import {
  E2E_QUERY_PARAM,
  E2E_SESSION_KEY,
  isE2EMode,
} from "../../src/utils/e2eMode";

describe("isE2EMode", () => {
  const originalSearch = window.location.search;

  afterEach(() => {
    sessionStorage.removeItem(E2E_SESSION_KEY);
    // Restore URL without e2e param
    window.history.replaceState({}, "", `/${originalSearch || ""}`);
  });

  it("is false by default", () => {
    sessionStorage.removeItem(E2E_SESSION_KEY);
    window.history.replaceState({}, "", "/");
    expect(isE2EMode()).toBe(false);
  });

  it("detects ?e2e=1 query", () => {
    window.history.replaceState({}, "", `/?${E2E_QUERY_PARAM}=1`);
    expect(isE2EMode()).toBe(true);
  });

  it("detects sessionStorage flag", () => {
    window.history.replaceState({}, "", "/");
    sessionStorage.setItem(E2E_SESSION_KEY, "1");
    expect(isE2EMode()).toBe(true);
  });
});
