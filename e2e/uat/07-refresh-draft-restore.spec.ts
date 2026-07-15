import { test, expect } from "@playwright/test";
import {
  editHeroName,
  expectUnsavedDraft,
  fieldByLabel,
  openConfigurator,
  waitForAppReady,
  waitForDraftHistoryCommit,
  E2E_PATH,
} from "../helpers/app";

/**
 * UAT: Unsaved draft survives hard reload (localStorage draft persist).
 */
test.describe("UAT — Draft survives refresh", () => {
  test("reload restores unsaved hero name into configurator", async ({
    page,
  }) => {
    await waitForAppReady(page);
    await openConfigurator(page);

    const name = `Persist-${Date.now().toString(36)}`;
    await editHeroName(page, name);
    await expectUnsavedDraft(page);
    // Wait past draftPersistMs
    await waitForDraftHistoryCommit(page);
    await page.waitForTimeout(500);

    // Hard reload with e2e harness
    await page.goto(E2E_PATH, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("button", { name: /Customize portfolio/i })
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(600);

    await openConfigurator(page);
    // Draft should restore (banner or field value)
    const field = fieldByLabel(page, /Hero first name/i);
    // May need Profile tab
    if (!(await field.isVisible().catch(() => false))) {
      await page
        .locator("nav")
        .filter({ has: page.getByRole("button", { name: "Resume Upload" }) })
        .getByRole("button", { name: "Profile", exact: true })
        .click({ force: true });
    }
    await expect(fieldByLabel(page, /Hero first name/i)).toHaveValue(name, {
      timeout: 15_000,
    });
    await expectUnsavedDraft(page);
  });
});
