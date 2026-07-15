import { test, expect } from "@playwright/test";
import {
  applyDraft,
  editHeroName,
  expectApplied,
  goToConfigTab,
  openConfigurator,
  waitForAppReady,
} from "../helpers/app";

test.describe("UAT — History and export", () => {
  test("apply creates version history entry", async ({ page }) => {
    await waitForAppReady(page);
    await openConfigurator(page);

    await editHeroName(page, `Hist-${Date.now().toString(36)}`);
    await applyDraft(page);
    await expectApplied(page);

    await goToConfigTab(page, "History");
    // Version list may be options in a select and/or list items
    const historyHit = page
      .locator("option, li, button, p, span")
      .filter({ hasText: /Applied from configurator/i })
      .first();
    await expect(historyHit).toBeAttached({ timeout: 10_000 });
  });

  test("export / import tab is reachable", async ({ page }) => {
    await waitForAppReady(page);
    await openConfigurator(page);
    await goToConfigTab(page, /Import \/ Export/);
    await expect(
      page.getByRole("button", { name: /Export|Copy|Download|Import/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
