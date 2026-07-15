/**
 * Test harness mode for Playwright / automated UAT.
 *
 * When active, decorative WebGL (hero PC, stars, contact planet) is disabled so
 * the main thread stays responsive for configurator, multi-tab sync, and history
 * flows — the product surface under test for cross-tab conflict recovery.
 *
 * Enable via:
 * - URL query `?e2e=1`
 * - sessionStorage key `portfolio-e2e` = `"1"` (set by E2E init script)
 */
export const E2E_QUERY_PARAM = "e2e";
export const E2E_SESSION_KEY = "portfolio-e2e";

export function isE2EMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get(E2E_QUERY_PARAM);
    if (q === "1" || q === "true") return true;
    if (window.sessionStorage?.getItem(E2E_SESSION_KEY) === "1") return true;
  } catch {
    // Private mode / blocked storage
  }
  return false;
}
