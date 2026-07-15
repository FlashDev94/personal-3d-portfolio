import { expect, type Locator, type Page } from "@playwright/test";

/** E2E harness query — disables decorative WebGL (see src/utils/e2eMode.ts). */
export const E2E_PATH = "/?e2e=1";

/** Wait past boot screen so portfolio UI is interactive. */
export async function waitForAppReady(page: Page, path = E2E_PATH) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Seed harness flag for any soft navigations within the session
  await page.evaluate(() => {
    try {
      sessionStorage.setItem("portfolio-e2e", "1");
    } catch {
      /* ignore */
    }
  });
  await expect(
    page.getByRole("button", { name: /Customize portfolio/i })
  ).toBeVisible({ timeout: 45_000 });
  // Brief settle so React hydration / boot opacity finish
  await page.waitForTimeout(400);
}

/**
 * Click via DOM when Playwright actionability stalls on overlays.
 * Prefers page.evaluate(querySelector) so we are not blocked by locator
 * re-attachment loops under heavy main-thread work.
 */
async function domClick(
  page: Page,
  locator: Locator,
  opts?: { ariaLabel?: string; roleSelector?: string }
) {
  // 1) Fast path: force click (CDP) when the node is stable
  try {
    await locator.click({
      force: true,
      timeout: 4_000,
      noWaitAfter: true,
    });
    return;
  } catch {
    /* fall through */
  }

  // 2) Page-level evaluate by aria-label / selector (most reliable under load)
  if (opts?.ariaLabel) {
    const clicked = await page.evaluate((label) => {
      const el = document.querySelector(
        `button[aria-label="${label}"]`
      ) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    }, opts.ariaLabel);
    if (clicked) return;
  }

  if (opts?.roleSelector) {
    const clicked = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (!el) return false;
      el.click();
      return true;
    }, opts.roleSelector);
    if (clicked) return;
  }

  // 3) Element handle evaluate as last resort
  const handle = await locator.elementHandle({ timeout: 8_000 });
  if (!handle) {
    throw new Error("domClick: element not found");
  }
  try {
    await page.evaluate((el) => {
      (el as HTMLElement).click();
    }, handle);
  } finally {
    await handle.dispose();
  }
}

export async function openConfigurator(page: Page) {
  const heading = page.getByRole("heading", {
    name: /Portfolio Configurator/i,
  });
  if (await heading.isVisible().catch(() => false)) {
    return;
  }

  const fab = page.getByRole("button", { name: /Customize portfolio/i });
  await expect(fab).toBeVisible({ timeout: 30_000 });

  // Retry open — first open can race boot opacity / lazy chunk load
  for (let attempt = 0; attempt < 4; attempt++) {
    if (await heading.isVisible().catch(() => false)) return;

    await domClick(page, fab, { ariaLabel: "Customize portfolio" });

    const opened = await heading
      .waitFor({ state: "visible", timeout: 12_000 })
      .then(() => true)
      .catch(() => false);
    if (opened) return;

    // Lazy chunk may still be loading — wait and retry
    await page.waitForTimeout(500 + attempt * 300);
  }

  await expect(heading).toBeVisible({ timeout: 15_000 });
}

export async function closeConfigurator(page: Page) {
  const close = page.getByRole("button", { name: /^Close$/i }).first();
  if (await close.isVisible().catch(() => false)) {
    await domClick(page, close);
    await page
      .getByRole("heading", { name: /Portfolio Configurator/i })
      .waitFor({ state: "hidden", timeout: 8_000 })
      .catch(() => undefined);
  }
}

/** Configurator side-nav tab. Use exact names ("Profile" ≠ "Profiles"). */
export async function goToConfigTab(page: Page, label: string | RegExp) {
  const panelNav = page
    .locator("nav")
    .filter({ has: page.getByRole("button", { name: "Resume Upload" }) });
  const btn =
    typeof label === "string"
      ? panelNav.getByRole("button", { name: label, exact: true })
      : panelNav.getByRole("button", { name: label });
  await expect(btn).toBeVisible({ timeout: 10_000 });
  const cls = (await btn.getAttribute("class")) || "";
  if (cls.includes("bg-[#915EFF]")) return;
  await domClick(page, btn);
}

export function fieldByLabel(page: Page, label: string | RegExp): Locator {
  return page
    .locator("label", { hasText: label })
    .locator("xpath=following-sibling::input[1]");
}

export async function editHeroName(page: Page, name: string) {
  await goToConfigTab(page, "Profile");
  const field = fieldByLabel(page, "Hero first name");
  await expect(field).toBeVisible({ timeout: 12_000 });
  await field.click({ force: true });
  await field.fill(name);
  await field.press("Tab");
  // Allow draft debounce + dirty flag
  await page.waitForTimeout(200);
}

/** Wait for undo stack to commit after typing (HISTORY_LIMITS.draftDebounceMs). */
export async function waitForDraftHistoryCommit(page: Page) {
  await page.waitForTimeout(550);
}

export async function applyDraft(page: Page) {
  const btn = page.getByRole("button", { name: /Apply to portfolio/i }).first();
  await domClick(page, btn);
}

export async function expectConflictBanner(page: Page) {
  await expect(
    page
      .getByText(
        /Live portfolio changed in another tab|Another tab saved a different draft/i
      )
      .first()
  ).toBeVisible({ timeout: 25_000 });
}

export async function expectUnsavedDraft(page: Page) {
  await expect(page.getByText("Unsaved draft", { exact: true })).toBeVisible({
    timeout: 12_000,
  });
}

export async function expectApplied(page: Page) {
  await expect(page.getByText(/Portfolio updated/i).first()).toBeVisible({
    timeout: 15_000,
  });
}
